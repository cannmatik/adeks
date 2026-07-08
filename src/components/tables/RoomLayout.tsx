'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Box, Paper, Stack, Tooltip, Typography, useTheme, useMediaQuery, AppBar, Toolbar, IconButton, ButtonBase, Snackbar, Alert, Button, Dialog, Badge } from '@mui/material';
import { ArrowBack, ArrowForward, TableRestaurant, GridView, Map as MapIcon, KeyboardArrowUp, KeyboardArrowDown, KeyboardArrowLeft, KeyboardArrowRight, ZoomIn, Close, ShoppingCart } from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';
import { CafeTable, RoomLite } from './TableCard';
import { useCategories } from '@/components/CategoryProvider';
import { FloorObjectItem, objectMeta, objectLabel } from './objectMeta';

interface Props {
  tables: CafeTable[];
  selectedIds?: Set<string>;
  onClickTable?: (t: CafeTable) => void;
  onCartClick?: () => void;
  disabledIds?: Set<string>;
  floor?: string;
  allowOccupiedClick?: boolean;
}

type Group = { room: RoomLite; tables: CafeTable[] };

function groupByRoom(tables: CafeTable[]): Group[] {
  const map = new Map<string, Group>();
  for (const t of tables) {
    if (!t.room) continue;
    let g = map.get(t.room.id);
    if (!g) {
      g = { room: t.room, tables: [] };
      map.set(t.room.id, g);
    }
    g.tables.push(t);
  }
  return Array.from(map.values()).sort(
    (a, b) => (a.room.display_order ?? 0) - (b.room.display_order ?? 0),
  );
}

const TILE = 40;
const GAP = 12;
const CELL = TILE + GAP;

const BOOKING_COLORS: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  AVAILABLE: { bg: '#FFFFFF', fg: '#111', border: '', label: 'Müsait' },
  HOLD: { bg: '#FEF3C7', fg: '#92400E', border: '#F59E0B', label: 'Beklemede' },
  CONFIRMED: { bg: '#FEE2E2', fg: '#991B1B', border: '#EF4444', label: 'Rezerve' },
  IN_USE: { bg: '#E0E7FF', fg: '#3730A3', border: '#6366F1', label: 'Kullanımda' },
  MAINTENANCE: { bg: '#52525B', fg: '#FFF', border: '#3F3F46', label: 'Bakımda' },
};

export default function RoomLayout({ tables, selectedIds, onClickTable, onCartClick, disabledIds, floor, allowOccupiedClick }: Props) {
  const { categoryMeta } = useCategories();
  const theme = useTheme();
  const { mode } = useColorScheme();
  const isDark = mode === 'dark' || theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [floorObjects, setFloorObjects] = useState<FloorObjectItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/floor-objects')
      .then((r) => (r.ok ? r.json() : { objects: [] }))
      .then((data) => {
        if (!cancelled) setFloorObjects(data.objects ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const floorObjectsByFloor = useMemo(() => {
    const map = new Map<string, FloorObjectItem[]>();
    for (const o of floorObjects) {
      if (!map.has(o.floor)) map.set(o.floor, []);
      map.get(o.floor)!.push(o);
    }
    return map;
  }, [floorObjects]);

  const groups = useMemo(() => {
    const all = groupByRoom(tables);
    return floor && floor !== 'ALL' ? all.filter((g) => g.room.floor === floor) : all;
  }, [tables, floor]);

  const byFloor = useMemo(() => {
    const map = new Map<string, Group[]>();
    for (const g of groups) {
      const f = g.room.floor ?? '1';
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [groups]);

  // Auto-resolve room collisions so they never visually overlap
  const adjustedPositions = useMemo(() => {
    const posMap = new Map<string, { col: number; row: number }>();
    for (const [, fgroups] of byFloor) {
      const sorted = [...fgroups].sort((a, b) => {
        const ar = a.room.floor_row ?? 0;
        const br = b.room.floor_row ?? 0;
        if (ar !== br) return ar - br;
        return (a.room.floor_col ?? 0) - (b.room.floor_col ?? 0);
      });
      const placed: Array<{ id: string; col: number; row: number; colSpan: number; rowSpan: number }> = [];
      for (const g of sorted) {
        let col = g.room.floor_col ?? 0;
        let row = g.room.floor_row ?? 0;
        const colSpan = g.room.col_span ?? 1;
        const rowSpan = g.room.row_span ?? 1;
        let hasCollision = true;
        while (hasCollision) {
          hasCollision = false;
          for (const p of placed) {
            if (
              col < p.col + p.colSpan &&
              col + colSpan > p.col &&
              row < p.row + p.rowSpan &&
              row + rowSpan > p.row
            ) {
              hasCollision = true;
              col = p.col + p.colSpan; // shift right
              break;
            }
          }
        }
        placed.push({ id: g.room.id, col, row, colSpan, rowSpan });
        posMap.set(g.room.id, { col, row });
      }
    }
    return posMap;
  }, [byFloor]);

  const [selectedMobileRoomId, setSelectedMobileRoomId] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'MAP' | 'LIST'>('LIST'); // Grid (flat tile list) by default
  const [showMapHint, setShowMapHint] = useState(false);
  const [floorOverviewOpen, setFloorOverviewOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollMap = (dx: number, dy: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  };

  // Kat genel görünümü açılınca, mevcut bölümü ortalayarak göster (soldan sürüklemeye gerek kalmasın)
  const overviewScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!floorOverviewOpen || !selectedMobileRoomId) return;
    const currentGroup = groups.find((g) => g.room.id === selectedMobileRoomId);
    if (!currentGroup) return;
    const raf = requestAnimationFrame(() => {
      const el = overviewScrollRef.current;
      if (!el) return;
      const OFFSET = 52;
      const adj = adjustedPositions.get(currentGroup.room.id);
      const roomLeft = (adj?.col ?? currentGroup.room.floor_col ?? 0) * CELL + OFFSET;
      const roomTop = (adj?.row ?? currentGroup.room.floor_row ?? 0) * CELL + OFFSET;
      const roomW = (currentGroup.room.col_span ?? 1) * CELL;
      const roomH = (currentGroup.room.row_span ?? 1) * CELL;
      el.scrollTo({
        left: Math.max(0, roomLeft + roomW / 2 - el.clientWidth / 2),
        top: Math.max(0, roomTop + roomH / 2 - el.clientHeight / 2),
        behavior: 'auto',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [floorOverviewOpen, selectedMobileRoomId, groups, adjustedPositions]);

  if (groups.length === 0) return null;

  const renderRoom = (g: Group, opts?: { noTranspose?: boolean }) => {
    const catMeta = g.room.category ? categoryMeta[g.room.category] : null;
    const accent = catMeta?.color ?? g.room.color ?? '#7E7E85';
    const short = catMeta?.short ?? g.room.name?.slice(0, 2).toUpperCase() ?? '??';
    const sectionLabel = g.room.short_code || (catMeta ? `${short}${g.room.display_order + 1}` : (g.room.name ?? 'Oda'));

    const gridW = Math.max(g.room.col_span ?? 8, 1, ...g.tables.map((t) => t.position_x + 1));
    const gridH = Math.max(g.room.row_span ?? 5, 1, ...g.tables.map((t) => t.position_y + 1));

    // Auto-transpose to ensure it's vertical on mobile (skipped for the true-to-life floor overview)
    const isHorizontal = gridW > gridH;
    const shouldTranspose = isMobile && isHorizontal && !opts?.noTranspose;

    const displayW = shouldTranspose ? gridH : gridW;
    const displayH = shouldTranspose ? gridW : gridH;

    const innerW = displayW * CELL;
    const innerH = displayH * CELL;

    return (
      <Paper
        key={g.room.id}
        elevation={0}
        sx={{
          position: 'relative',
          borderRadius: 0,
          bgcolor: isDark ? '#16161C' : '#FFFFFF',
          p: 0,
          flexShrink: 0,
          width: innerW,
          height: innerH + 28, // 28px for inline header
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
          border: `1.5px solid ${accent}30`,
          '&:hover': {
            borderColor: `${accent}60`,
            boxShadow: isDark ? `0 8px 30px ${accent}20` : `0 6px 20px ${accent}15`,
          },
        }}
      >
        {/* Inline Header */}
        <Box
          sx={{
            height: 28,
            display: 'flex',
            alignItems: 'center',
            px: displayW < 3 ? 0.6 : 1.5,
            borderBottom: `1px solid ${accent}15`,
            bgcolor: isDark ? `${accent}08` : `${accent}06`,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: accent,
              mr: 1,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: accent,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sectionLabel}
          </Typography>
          {displayW >= 3 && (
            <Stack
              direction="row"
              spacing={0.3}
              sx={{
                alignItems: 'center',
                ml: 'auto',
                flexShrink: 0,
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {g.tables.length}
              </Typography>
              <TableRestaurant sx={{ fontSize: 13, opacity: 0.8 }} />
            </Stack>
          )}
        </Box>

        {/* Room Grid Area */}
        <Box
          sx={{
            position: 'relative',
            width: innerW,
            height: innerH,
            flexGrow: 1,
          }}
        >
          {g.tables.map((t) => {
            const displayX = shouldTranspose ? t.position_y : t.position_x;
            const displayY = shouldTranspose ? t.position_x : t.position_y;
            return (
              <TableTile
                key={t.id}
                table={t}
                selected={!!selectedIds?.has(t.id)}
                disabled={!!disabledIds?.has(t.id)}
                onClick={onClickTable}
                isDark={isDark}
                allowOccupiedClick={allowOccupiedClick}
                round={t.shape === 'ROUND'}
                sx={{
                  position: 'absolute',
                  left: displayX * CELL + GAP / 2,
                  top: displayY * CELL + GAP / 2,
                }}
              />
            );
          })}
        </Box>
      </Paper>
    );
  };

  // Mobile Single Room View
  if (isMobile && selectedMobileRoomId) {
    const group = groups.find((g) => g.room.id === selectedMobileRoomId);
    if (!group) {
      setSelectedMobileRoomId(null);
      return null;
    }

    const miniGridW = Math.max(group.room.col_span ?? 8, 1, ...group.tables.map((t) => t.position_x + 1));
    const miniGridH = Math.max(group.room.row_span ?? 5, 1, ...group.tables.map((t) => t.position_y + 1));
    const miniTranspose = miniGridW > miniGridH;

    const groupsOnFloor = groups.filter((g) => g.room.floor === group.room.floor);
    const roomsOnFloor = groupsOnFloor.map((g) => g.room);
    const objectsOnFloor = floorObjectsByFloor.get(group.room.floor) ?? [];

    const OV_VISUAL_OFFSET_X = 52;
    const OV_VISUAL_OFFSET_Y = 52;
    const overviewMaxCol = Math.max(
      0,
      ...groupsOnFloor.map((g) => {
        const adj = adjustedPositions.get(g.room.id);
        return (adj?.col ?? g.room.floor_col ?? 0) + (g.room.col_span ?? 1);
      }),
      ...objectsOnFloor.map((o) => o.floor_col + o.col_span),
    );
    const overviewMaxRow = Math.max(
      0,
      ...groupsOnFloor.map((g) => {
        const adj = adjustedPositions.get(g.room.id);
        return (adj?.row ?? g.room.floor_row ?? 0) + (g.room.row_span ?? 1);
      }),
      ...objectsOnFloor.map((o) => o.floor_row + o.row_span),
    );
    const overviewCanvasW = overviewMaxCol * CELL + OV_VISUAL_OFFSET_X + 40;
    const overviewCanvasH = overviewMaxRow * CELL + OV_VISUAL_OFFSET_Y + 40;

    return (
      <>
      <Dialog fullScreen open={true} sx={{ zIndex: 1350, '& .MuiDialog-paper': { bgcolor: 'background.default', display: 'flex', flexDirection: 'column' } }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => { setSelectedMobileRoomId(null); setMobileViewMode('LIST'); }} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
              {group.room.name || 'Oda'}
            </Typography>
            {roomsOnFloor.length > 1 && (
              <Tooltip title="Kat Haritası">
                <IconButton onClick={() => setFloorOverviewOpen(true)} color="primary">
                  <MapIcon />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={() => setMobileViewMode(v => v === 'MAP' ? 'LIST' : 'MAP')} color="primary">
              {mobileViewMode === 'MAP' ? <GridView /> : <TableRestaurant />}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileViewMode === 'MAP' ? (
            <>
              <Box
                ref={scrollRef}
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'safe center',
                  alignItems: 'safe center',
                  p: 4,
                  pb: 16
                }}
              >
                {renderRoom(group)}
              </Box>

              {/* Minimap */}
              <MapMinimap
                scrollRef={scrollRef}
                isDark={isDark}
                tables={group.tables}
                transposed={miniTranspose}
                selectedIds={selectedIds}
                roomKey={`${group.room.id}-${mobileViewMode}`}
              />

              {/* Directional Controls */}
              <Box sx={{ position: 'absolute', right: 16, bottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, zIndex: 1250 }}>
                <IconButton onClick={() => scrollMap(0, -80)} sx={{ bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'background.paper' } }}>
                  <KeyboardArrowUp />
                </IconButton>
                <Box sx={{ display: 'flex', gap: 5 }}>
                  <IconButton onClick={() => scrollMap(-80, 0)} sx={{ bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'background.paper' } }}>
                    <KeyboardArrowLeft />
                  </IconButton>
                  <IconButton onClick={() => scrollMap(80, 0)} sx={{ bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'background.paper' } }}>
                    <KeyboardArrowRight />
                  </IconButton>
                </Box>
                <IconButton onClick={() => scrollMap(0, 80)} sx={{ bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'background.paper' } }}>
                  <KeyboardArrowDown />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, pb: 14 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                {group.tables.map(t => (
                  <TableTile
                    key={t.id}
                    table={t}
                    selected={!!selectedIds?.has(t.id)}
                    disabled={!!disabledIds?.has(t.id)}
                    onClick={onClickTable}
                    isDark={isDark}
                    allowOccupiedClick={allowOccupiedClick}
                    round={t.shape === 'ROUND'}
                    sx={{ position: 'relative', width: 64, height: 64, fontSize: 16 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 2, pb: 12, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          
        </Box>
        <Snackbar
          open={showMapHint && mobileViewMode === 'LIST'}
          autoHideDuration={8000}
          onClose={() => setShowMapHint(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ top: { xs: 70, sm: 70 } }}
        >
          <Alert 
            onClose={() => {
              if (typeof window !== 'undefined') localStorage.setItem('mapHintDismissed', 'true');
              setShowMapHint(false);
            }} 
            severity="info" 
            sx={{ width: '100%', boxShadow: 3, alignItems: 'center' }}
          >
            Masaların kafedeki gerçek dizilimini (yan yana, karşılıklı vb.) görmek için sağ üstteki ikona tıklayabilirsiniz.
          </Alert>
        </Snackbar>

      </Dialog>

      {/* Tam ekran, gezinilebilir kat genel görünümü — tüm bölümler ve masalar */}
      <Dialog
        fullScreen
        open={floorOverviewOpen}
        onClose={() => setFloorOverviewOpen(false)}
        sx={{ zIndex: 1400, '& .MuiDialog-paper': { bgcolor: 'background.default' } }}
      >
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
              {group.room.floor}. Kat — Tüm Bölümler
            </Typography>
            <IconButton edge="end" onClick={() => setFloorOverviewOpen(false)}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box ref={overviewScrollRef} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Box sx={{ position: 'relative', width: overviewCanvasW, height: overviewCanvasH }}>
            {groupsOnFloor.map((g) => {
              const adj = adjustedPositions.get(g.room.id);
              const isCurrentRoom = g.room.id === group.room.id;
              return (
                <Box
                  key={g.room.id}
                  sx={{
                    position: 'absolute',
                    top: (adj?.row ?? g.room.floor_row ?? 0) * CELL + OV_VISUAL_OFFSET_Y,
                    left: (adj?.col ?? g.room.floor_col ?? 0) * CELL + OV_VISUAL_OFFSET_X,
                  }}
                >
                  {isCurrentRoom && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: '50%',
                        top: -26,
                        transform: 'translateX(-50%)',
                        bgcolor: '#E11D2A',
                        color: '#FFF',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.03em',
                        px: 1,
                        py: 0.3,
                        borderRadius: 1,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(225,29,42,0.4)',
                        zIndex: 5,
                      }}
                    >
                      📍 BURADASINIZ
                    </Box>
                  )}
                  <Box
                    sx={
                      isCurrentRoom
                        ? {
                            outline: '3px solid #E11D2A',
                            outlineOffset: 2,
                            borderRadius: 1,
                            boxShadow: '0 0 0 6px rgba(225,29,42,0.15)',
                          }
                        : undefined
                    }
                  >
                    {renderRoom(g, { noTranspose: true })}
                  </Box>
                </Box>
              );
            })}
            {objectsOnFloor.map((o) => (
              <ObjectTile
                key={o.id}
                obj={o}
                isDark={isDark}
                sx={{
                  position: 'absolute',
                  left: o.floor_col * CELL + OV_VISUAL_OFFSET_X,
                  top: o.floor_row * CELL + OV_VISUAL_OFFSET_Y,
                  width: o.col_span * CELL,
                  height: o.row_span * CELL,
                }}
              />
            ))}
          </Box>
        </Box>
        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          
        </Box>
      </Dialog>
      </>
    );
  }

  // Mobile Room Selection List
  if (isMobile) {
    return (
      <Stack spacing={3}>
        {byFloor.map(([f, fgroups]) => (
          <Box key={f}>
            {(!floor || floor === 'ALL') && (
              <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: 'text.primary' }}>
                {f}. Kat
              </Typography>
            )}
            <Stack spacing={2}>
              {fgroups.map(g => {
                const catMeta = g.room.category ? categoryMeta[g.room.category] : null;
                const accent = catMeta?.color ?? g.room.color ?? '#7E7E85';
                const count = g.tables.length;
                return (
                  <ButtonBase
                    key={g.room.id}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setSelectedMobileRoomId(g.room.id);
                      setMobileViewMode('LIST');
                      if (typeof window !== 'undefined' && localStorage.getItem('mapHintDismissed') !== 'true') {
                        setShowMapHint(true);
                      }
                    }}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: 3,
                      display: 'block',
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        bgcolor: isDark ? '#16161C' : '#FFFFFF',
                        border: `1.5px solid ${accent}40`,
                        borderRadius: 3,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: accent }}>
                          {g.room.name || 'Oda'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {count} Masa
                        </Typography>
                      </Box>
                      <ArrowForward sx={{ color: 'text.secondary' }} />
                    </Paper>
                  </ButtonBase>
                );
              })}
            </Stack>
          </Box>
        ))}
        <Box sx={{ pt: 2 }}>
          
        </Box>
      </Stack>
    );
  }

  // Desktop View
  const VISUAL_OFFSET_X = 52;
  const VISUAL_OFFSET_Y = 52;

  return (
    <Stack spacing={3}>
      {byFloor.map(([f, fgroups]) => {
        const floorObjs = floorObjectsByFloor.get(f) ?? [];
        // Calculate dynamic canvas size from room + object positions (same logic as admin)
        const maxCol = Math.max(
          0,
          ...fgroups.map(g => {
            const adj = adjustedPositions.get(g.room.id);
            return (adj?.col ?? g.room.floor_col ?? 0) + (g.room.col_span ?? 1);
          }),
          ...floorObjs.map(o => o.floor_col + o.col_span),
        );
        const maxRow = Math.max(
          0,
          ...fgroups.map(g => {
            const adj = adjustedPositions.get(g.room.id);
            return (adj?.row ?? g.room.floor_row ?? 0) + (g.room.row_span ?? 1);
          }),
          ...floorObjs.map(o => o.floor_row + o.row_span),
        );
        const canvasH = maxRow * CELL + VISUAL_OFFSET_Y + 52;

        return (
          <Box key={f}>
            <Typography
              variant="h6"
              sx={{
                mb: 1.5,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color: 'text.primary',
              }}
            >
              {f}. Kat
            </Typography>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                minHeight: canvasH,
                overflow: 'auto',
                p: 0,
                bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.015)',
                borderRadius: 3,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              {fgroups.map((g) => {
                const adj = adjustedPositions.get(g.room.id);
                return (
                  <Box
                    key={g.room.id}
                    sx={{
                      position: 'absolute',
                      top: (adj?.row ?? g.room.floor_row ?? 0) * CELL + VISUAL_OFFSET_Y,
                      left: (adj?.col ?? g.room.floor_col ?? 0) * CELL + VISUAL_OFFSET_X,
                    }}
                  >
                    {renderRoom(g)}
                  </Box>
                );
              })}

              {floorObjs.map((o) => (
                <ObjectTile
                  key={o.id}
                  obj={o}
                  isDark={isDark}
                  sx={{
                    position: 'absolute',
                    left: o.floor_col * CELL + VISUAL_OFFSET_X,
                    top: o.floor_row * CELL + VISUAL_OFFSET_Y,
                    width: o.col_span * CELL,
                    height: o.row_span * CELL,
                  }}
                />
              ))}
            </Box>
          </Box>
        );
      })}
      
    </Stack>
  );
}

function TableTile({
  table,
  selected,
  disabled,
  onClick,
  isDark,
  sx,
  allowOccupiedClick,
  round,
}: {
  table: CafeTable;
  selected: boolean;
  disabled: boolean;
  onClick?: (t: CafeTable) => void;
  isDark: boolean;
  sx?: any;
  allowOccupiedClick?: boolean;
  round?: boolean;
}) {
  const { categoryMeta } = useCategories();
  const meta = categoryMeta[table.category] ?? {
    label: table.category ?? 'Bilinmeyen',
    short: (table.category ?? '?').slice(0, 2),
    color: '#7E7E85',
    defaultRate: 0,
    description: '',
  };
  const booking = table.booking_status ?? 'AVAILABLE';
  const isAvailable = booking === 'AVAILABLE' && table.status !== 'MAINTENANCE';
  const clickable = !!onClick && !disabled && (isAvailable || (allowOccupiedClick && table.status !== 'MAINTENANCE'));

  let bg = '#FFFFFF';
  let fg = '#111';
  let border = meta.color;
  let shadow = '0 1px 2px rgba(0,0,0,0.06)';

  if (table.session?.needs_support) {
    bg = isDark ? '#450A0A' : '#FEE2E2';
    fg = isDark ? '#FCA5A5' : '#DC2626';
    border = '#EF4444';
    shadow = '0 0 0 3px rgba(239,68,68,0.5), 0 4px 14px rgba(239,68,68,0.4)';
  } else if (table.session?.has_pending_order) {
    bg = isDark ? '#451A03' : '#FEF3C7';
    fg = isDark ? '#FCD34D' : '#D97706';
    border = '#F59E0B';
    shadow = '0 0 0 3px rgba(245,158,11,0.5), 0 4px 14px rgba(245,158,11,0.4)';
  } else if (booking === 'HOLD') {
    bg = isDark ? '#451A03' : '#FEF3C7';
    fg = isDark ? '#FCD34D' : '#92400E';
    border = '#F59E0B';
    shadow = '0 2px 8px rgba(245,158,11,0.25)';
  } else if (booking === 'CONFIRMED') {
    bg = isDark ? '#450A0A' : '#FEE2E2';
    fg = isDark ? '#FCA5A5' : '#991B1B';
    border = '#EF4444';
    shadow = '0 2px 8px rgba(239,68,68,0.25)';
  } else if (booking === 'IN_USE') {
    bg = isDark ? '#1E1B4B' : '#E0E7FF';
    fg = isDark ? '#A5B4FC' : '#3730A3';
    border = '#6366F1';
    shadow = '0 2px 8px rgba(99,102,241,0.25)';
  } else if (table.status === 'MAINTENANCE') {
    bg = isDark ? '#27272A' : '#E4E4E7';
    fg = isDark ? '#A1A1AA' : '#52525B';
    border = '#71717A';
    shadow = 'none';
  } else if (table.category !== 'GARDEN') {
    bg = meta.color;
    fg = '#FFFFFF';
    border = meta.color;
  } else if (isDark) {
    bg = '#0E0E12';
    fg = '#FFF';
    border = meta.color;
  } else {
    bg = '#FFFFFF';
    fg = '#111';
    border = meta.color;
  }

  if (selected) {
    bg = meta.color;
    fg = '#FFF';
    border = meta.color;
    shadow = `0 0 0 3px ${meta.color}44, 0 4px 14px ${meta.color}44`;
  }

  return (
    <Tooltip
      arrow
      disableTouchListener
      title={
        <Box sx={{ p: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Masa #{table.number} — {meta.label}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            {BOOKING_COLORS[booking]?.label || 'Müsait'}
            {meta.defaultRate > 0 ? ` · ${meta.defaultRate} ₺/saat` : ''}
          </Typography>
          {table.session && (
            <>
              <Typography variant="caption" sx={{ display: 'block', color: '#6366F1', fontWeight: 600 }}>
                {table.session.kind === 'MEMBER' ? '👤 Üye' : '👤 Anonim'} {table.session.user_name ? `— ${table.session.user_name}` : ''}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                ⏱ {table.session.elapsed} · ~{table.session.estimated}
              </Typography>
            </>
          )}
        </Box>
      }
    >
      <Box
        onClick={() => clickable && onClick?.(table)}
        sx={{
          width: TILE,
          height: TILE,
          bgcolor: bg,
          color: fg,
          border: `2px solid ${border}`,
          borderRadius: round ? '50%' : 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          cursor: clickable ? 'pointer' : 'default',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
          opacity: disabled && !selected ? 0.4 : 1,
          boxShadow: shadow,
          flexShrink: 0,
          '&:hover': clickable
            ? {
                '@media (hover: hover)': {
                  transform: 'translateY(-2px) scale(1.06)',
                  boxShadow: `0 6px 18px ${meta.color}55`,
                  zIndex: 1,
                },
              }
            : undefined,
          ...sx,
        }}
      >
        {table.number}
      </Box>
    </Tooltip>
  );
}

function ObjectTile({ obj, isDark, sx }: { obj: FloorObjectItem; isDark: boolean; sx?: any }) {
  const meta = objectMeta(obj.kind);
  const label = objectLabel(obj);
  return (
    <Tooltip arrow disableTouchListener title={label}>
      <Box
        sx={{
          bgcolor: isDark ? `${meta.color}14` : `${meta.color}0D`,
          border: `1.5px dashed ${meta.color}80`,
          borderRadius: 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.25,
          color: meta.color,
          fontSize: 16,
          overflow: 'hidden',
          pointerEvents: 'auto',
          ...sx,
        }}
      >
        {meta.icon}
        <Typography
          sx={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: meta.color,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            px: 0.25,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function FloorOverviewMinimap({
  rooms,
  currentRoomId,
  floorObjects,
  isDark,
  onOpen,
}: {
  rooms: RoomLite[];
  currentRoomId: string;
  floorObjects: FloorObjectItem[];
  isDark: boolean;
  onOpen: () => void;
}) {
  if (rooms.length <= 1 && floorObjects.length === 0) return null; // tek bölüm varsa göstermeye gerek yok

  const UNIT = 10;
  const MAX_W = 92;
  const MAX_H = 130;
  const maxCol = Math.max(
    1,
    ...rooms.map((r) => (r.floor_col ?? 0) + (r.col_span ?? 1)),
    ...floorObjects.map((o) => o.floor_col + o.col_span),
  );
  const maxRow = Math.max(
    1,
    ...rooms.map((r) => (r.floor_row ?? 0) + (r.row_span ?? 1)),
    ...floorObjects.map((o) => o.floor_row + o.row_span),
  );
  const scale = Math.min(MAX_W / (maxCol * UNIT), MAX_H / (maxRow * UNIT), 1.5);
  const w = maxCol * UNIT * scale;
  const h = maxRow * UNIT * scale;

  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 1250,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        p: 0,
        borderRadius: 1.5,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: w,
          height: h,
          borderRadius: 1.5,
          overflow: 'hidden',
          bgcolor: isDark ? 'rgba(10,10,14,0.85)' : 'rgba(255,255,255,0.9)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(4px)',
        }}
      >
      {rooms.map((r) => {
        const isCurrent = r.id === currentRoomId;
        const accent = r.color ?? '#7E7E85';
        return (
          <Box
            key={r.id}
            sx={{
              position: 'absolute',
              left: (r.floor_col ?? 0) * UNIT * scale,
              top: (r.floor_row ?? 0) * UNIT * scale,
              width: Math.max(3, (r.col_span ?? 1) * UNIT * scale),
              height: Math.max(3, (r.row_span ?? 1) * UNIT * scale),
              bgcolor: isCurrent ? '#E11D2A' : `${accent}90`,
              border: isCurrent ? '1.5px solid #FFF' : 'none',
              borderRadius: 0.25,
            }}
          />
        );
      })}
      {floorObjects.map((o) => (
        <Box
          key={o.id}
          sx={{
            position: 'absolute',
            left: o.floor_col * UNIT * scale,
            top: o.floor_row * UNIT * scale,
            width: Math.max(2, o.col_span * UNIT * scale),
            height: Math.max(2, o.row_span * UNIT * scale),
            bgcolor: `${objectMeta(o.kind).color}66`,
            borderRadius: 0.25,
          }}
        />
      ))}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)',
          opacity: 0,
          transition: 'opacity 0.15s ease',
          '&:active': { opacity: 1 },
        }}
      >
        <ZoomIn sx={{ fontSize: 18, color: isDark ? '#FFF' : '#111' }} />
      </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.4,
          bgcolor: isDark ? 'rgba(10,10,14,0.85)' : 'rgba(255,255,255,0.9)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
          borderRadius: 1,
          px: 0.75,
          py: 0.2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <MapIcon sx={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }} />
        <Typography sx={{ fontSize: 9, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.65)', whiteSpace: 'nowrap' }}>
          Kat Haritası
        </Typography>
      </Box>
    </ButtonBase>
  );
}

const MINIMAP_MAX_W = 110;
const MINIMAP_MAX_H = 150;
const ROOM_HEADER_H = 28;

function MapMinimap({
  scrollRef,
  isDark,
  tables,
  transposed,
  selectedIds,
  roomKey,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isDark: boolean;
  tables: CafeTable[];
  transposed: boolean;
  selectedIds?: Set<string>;
  roomKey: string;
}) {
  const [m, setM] = useState<{
    sl: number; st: number; cw: number; ch: number; sw: number; sh: number;
    ol: number; ot: number;
  } | null>(null);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const roomEl = el.firstElementChild as HTMLElement | null;
    setM({
      sl: el.scrollLeft,
      st: el.scrollTop,
      cw: el.clientWidth,
      ch: el.clientHeight,
      sw: el.scrollWidth,
      sh: el.scrollHeight,
      ol: roomEl?.offsetLeft ?? 0,
      ot: roomEl?.offsetTop ?? 0,
    });
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    // Content is laid out after first paint; measure again shortly after mount
    const t = setTimeout(update, 150);
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', update);
    };
  }, [scrollRef, update, roomKey]);

  if (!m || m.sw <= m.cw + 4 && m.sh <= m.ch + 4) return null; // no scroll → no need

  const scale = Math.min(MINIMAP_MAX_W / m.sw, MINIMAP_MAX_H / m.sh);
  const miniW = m.sw * scale;
  const miniH = m.sh * scale;

  const bookingDot = (t: CafeTable): string => {
    if (selectedIds?.has(t.id)) return '#E11D2A';
    if (t.status === 'MAINTENANCE') return '#71717A';
    const b = t.booking_status ?? 'AVAILABLE';
    if (b === 'HOLD') return '#F59E0B';
    if (b === 'CONFIRMED') return '#EF4444';
    if (b === 'IN_USE') return '#6366F1';
    return '#22C55E';
  };

  const handleJump = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    scrollRef.current?.scrollTo({
      left: x - m.cw / 2,
      top: y - m.ch / 2,
      behavior: 'smooth',
    });
  };

  return (
    <Box
      onClick={handleJump}
      sx={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1250,
        width: miniW,
        height: miniH,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: isDark ? 'rgba(10,10,14,0.85)' : 'rgba(255,255,255,0.9)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(4px)',
        cursor: 'pointer',
      }}
    >
      {/* Table dots */}
      {tables.map((t) => {
        const dx = transposed ? t.position_y : t.position_x;
        const dy = transposed ? t.position_x : t.position_y;
        const selected = selectedIds?.has(t.id);
        const size = Math.max(3, TILE * scale);
        return (
          <Box
            key={t.id}
            sx={{
              position: 'absolute',
              left: (m.ol + GAP / 2 + dx * CELL) * scale,
              top: (m.ot + ROOM_HEADER_H + GAP / 2 + dy * CELL) * scale,
              width: size,
              height: size,
              bgcolor: bookingDot(t),
              borderRadius: t.shape === 'ROUND' ? '50%' : 0.25,
              outline: selected ? '1.5px solid #FFF' : 'none',
              zIndex: selected ? 2 : 1,
            }}
          />
        );
      })}
      {/* Viewport indicator */}
      <Box
        sx={{
          position: 'absolute',
          left: m.sl * scale,
          top: m.st * scale,
          width: m.cw * scale,
          height: m.ch * scale,
          border: '1.5px solid #E11D2A',
          borderRadius: 0.5,
          bgcolor: 'rgba(225,29,42,0.08)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}

export function Legend({ isDark, categoryMeta }: { isDark: boolean; categoryMeta: Record<string, any> }) {
  const categories = Object.entries(categoryMeta);
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
      {categories.map(([key, c]) => (
        <LegendDot key={key} color={c.color || '#ccc'} label={c.label || key} isDark={isDark} filled />
      ))}
    </Stack>
  );
}

function LegendDot({ color, label, filled, isDark }: { color: string; label: string; filled?: boolean; isDark: boolean }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: 0.5,
          bgcolor: filled ? color : isDark ? '#FFF' : '#FFF',
          border: `2px solid ${color}`,
          boxShadow: filled ? `0 0 0 1px ${color}44` : '0 0 0 1px rgba(0,0,0,0.06)',
        }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
    </Stack>
  );
}

