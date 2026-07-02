'use client';

import React, { useMemo, useState, useRef } from 'react';
import { Box, Paper, Stack, Tooltip, Typography, useTheme, useMediaQuery, AppBar, Toolbar, IconButton, ButtonBase, Snackbar, Alert, Button, Dialog } from '@mui/material';
import { ArrowBack, ArrowForward, TableRestaurant, GridView, Map as MapIcon, KeyboardArrowUp, KeyboardArrowDown, KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';
import { CafeTable, RoomLite } from './TableCard';
import { useCategories } from '@/components/CategoryProvider';

interface Props {
  tables: CafeTable[];
  selectedIds?: Set<string>;
  onClickTable?: (t: CafeTable) => void;
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

export default function RoomLayout({ tables, selectedIds, onClickTable, disabledIds, floor, allowOccupiedClick }: Props) {
  const { categoryMeta } = useCategories();
  const theme = useTheme();
  const { mode } = useColorScheme();
  const isDark = mode === 'dark' || theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
  const [mobileViewMode, setMobileViewMode] = useState<'MAP' | 'LIST'>('LIST'); // User seems to prefer list by default
  const [showMapHint, setShowMapHint] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollMap = (dx: number, dy: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    }
  };

  if (groups.length === 0) return null;

  const renderRoom = (g: Group) => {
    const catMeta = g.room.category ? categoryMeta[g.room.category] : null;
    const accent = catMeta?.color ?? g.room.color ?? '#7E7E85';
    const short = catMeta?.short ?? g.room.name?.slice(0, 2).toUpperCase() ?? '??';
    const sectionLabel = catMeta ? `${short}${g.room.display_order + 1}` : (g.room.name ?? 'Oda');

    const gridW = Math.max(g.room.col_span ?? 8, 1, ...g.tables.map((t) => t.position_x + 1));
    const gridH = Math.max(g.room.row_span ?? 5, 1, ...g.tables.map((t) => t.position_y + 1));
    
    // Auto-transpose to ensure it's vertical on mobile
    const isHorizontal = gridW > gridH;
    const shouldTranspose = isMobile && isHorizontal;
    
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
    
    return (
      <Dialog fullScreen open={true} sx={{ zIndex: 1200, '& .MuiDialog-paper': { bgcolor: 'background.default', display: 'flex', flexDirection: 'column' } }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => { setSelectedMobileRoomId(null); setMobileViewMode('LIST'); }} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
              {group.room.name || 'Oda'}
            </Typography>
            <IconButton onClick={() => setMobileViewMode(v => v === 'MAP' ? 'LIST' : 'MAP')} color="primary">
              {mobileViewMode === 'MAP' ? <GridView /> : <MapIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileViewMode === 'MAP' ? (
            <>
              <Box 
                ref={scrollRef}
                sx={{ 
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
          <Legend isDark={isDark} />
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

        {selectedIds && selectedIds.size > 0 && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              zIndex: 1300,
              p: 1.5,
              borderRadius: 2,
              border: '1.5px solid',
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {selectedIds.size} Masa Seçili
            </Typography>
            <Button 
              size="small" 
              variant="contained" 
              onClick={() => { setSelectedMobileRoomId(null); setMobileViewMode('LIST'); }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Devam Et
            </Button>
          </Paper>
        )}
      </Dialog>
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
                    onClick={() => { 
                      setSelectedMobileRoomId(g.room.id); 
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
          <Legend isDark={isDark} />
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
        // Calculate dynamic canvas size from room positions (same logic as admin)
        const maxCol = Math.max(0, ...fgroups.map(g => {
          const adj = adjustedPositions.get(g.room.id);
          return (adj?.col ?? g.room.floor_col ?? 0) + (g.room.col_span ?? 1);
        }));
        const maxRow = Math.max(0, ...fgroups.map(g => {
          const adj = adjustedPositions.get(g.room.id);
          return (adj?.row ?? g.room.floor_row ?? 0) + (g.room.row_span ?? 1);
        }));
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
            </Box>
          </Box>
        );
      })}
      <Legend isDark={isDark} />
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

  if (booking === 'HOLD') {
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

function Legend({ isDark }: { isDark: boolean }) {
  return (
    <Stack direction="row" spacing={2} sx={{ mt: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
      <LegendDot color="#22C55E" label="Müsait" isDark={isDark} />
      <LegendDot color="#F59E0B" label="Beklemede" filled isDark={isDark} />
      <LegendDot color="#EF4444" label="Rezerve" filled isDark={isDark} />
      <LegendDot color="#6366F1" label="Kullanımda" filled isDark={isDark} />
      <LegendDot color="#71717A" label="Bakımda" filled isDark={isDark} />
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

