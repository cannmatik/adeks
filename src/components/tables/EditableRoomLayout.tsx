'use client';

import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, useTheme, useMediaQuery, Paper, AppBar, Toolbar, IconButton, ButtonBase, Button } from '@mui/material';
import { ArrowBack, ArrowForward, Add } from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';
import { CafeTable, RoomLite } from './TableCard';
import EditableRoomCard from './EditableRoomCard';
import { useCategories } from '@/components/CategoryProvider';

interface Props {
  rooms: RoomLite[];
  tables: CafeTable[];
  onTableMove: (id: string, roomId: string, x: number, y: number) => void;
  onTableDelete: (id: string) => void;
  onTableEdit: (table: CafeTable) => void;
  onTableAdd: (roomId: string, x: number, y: number) => void;
  onRoomEdit?: (room: RoomLite) => void;
  onRoomDelete?: (roomId: string) => void;
  onRoomResize?: (roomId: string, colSpan: number, rowSpan: number) => void;
  onRoomMove?: (roomId: string, floorCol: number, floorRow: number) => void;
  onRoomQuickAdd?: (floor: string) => void;
  placingRoom?: { floor: string; colSpan: number; rowSpan: number } | null;
  onRoomPlace?: (floor: string, col: number, row: number) => void;
}

type Group = { room: RoomLite; tables: CafeTable[] };

function groupByRoom(rooms: RoomLite[], tables: CafeTable[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rooms) {
    map.set(r.id, { room: r, tables: [] });
  }
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

function roomsOverlap(
  a: { floor_col: number; floor_row: number; col_span: number; row_span: number },
  b: { floor_col: number; floor_row: number; col_span: number; row_span: number },
) {
  return (
    a.floor_col < b.floor_col + b.col_span &&
    a.floor_col + a.col_span > b.floor_col &&
    a.floor_row < b.floor_row + b.row_span &&
    a.floor_row + a.row_span > b.floor_row
  );
}

export default function EditableRoomLayout({
  rooms,
  tables,
  onTableMove,
  onTableDelete,
  onTableEdit,
  onTableAdd,
  onRoomEdit,
  onRoomDelete,
  onRoomResize,
  onRoomMove,
  onRoomQuickAdd,
  placingRoom,
  onRoomPlace,
}: Props) {
  const { categoryMeta } = useCategories();
  const theme = useTheme();
  const { mode } = useColorScheme();
  const isDark = mode === 'dark' || theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const groups = useMemo(() => groupByRoom(rooms, tables), [rooms, tables]);

  const handleRoomMove = (roomId: string, floorCol: number, floorRow: number) => {
    if (!onRoomMove) return;
    const moving = rooms.find((r) => r.id === roomId);
    if (!moving) return;

    const candidate = {
      floor_col: floorCol,
      floor_row: floorRow,
      col_span: moving.col_span ?? 1,
      row_span: moving.row_span ?? 1,
    };

    for (const other of rooms) {
      if (other.id === roomId) continue;
      if (other.floor !== moving.floor) continue;
      if (
        roomsOverlap(candidate, {
          floor_col: other.floor_col ?? 0,
          floor_row: other.floor_row ?? 0,
          col_span: other.col_span ?? 1,
          row_span: other.row_span ?? 1,
        })
      ) {
        return; // çakışma var, taşıma
      }
    }
    onRoomMove(roomId, floorCol, floorRow);
  };

  const handleRoomPlace = (floor: string, col: number, row: number) => {
    if (!onRoomPlace || !placingRoom) return;
    const candidate = {
      floor_col: col,
      floor_row: row,
      col_span: placingRoom.colSpan,
      row_span: placingRoom.rowSpan,
    };
    for (const other of rooms) {
      if (other.floor !== floor) continue;
      if (
        roomsOverlap(candidate, {
          floor_col: other.floor_col ?? 0,
          floor_row: other.floor_row ?? 0,
          col_span: other.col_span ?? 1,
          row_span: other.row_span ?? 1,
        })
      ) {
        return; // çakışma var, yerleştirme
      }
    }
    onRoomPlace(floor, col, row);
  };

  const byFloor = useMemo(() => {
    const map = new Map<string, Group[]>();
    for (const g of groups) {
      const f = g.room.floor ?? '1';
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [groups]);

  const [selectedMobileRoomId, setSelectedMobileRoomId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!placingRoom) {
      setHoverPos(null);
    }
  }, [placingRoom]);

  if (groups.length === 0) return null;

  // Mobile Single Room View
  if (isMobile && selectedMobileRoomId) {
    const group = groups.find(g => g.room.id === selectedMobileRoomId);
    if (!group) {
      setSelectedMobileRoomId(null);
      return null;
    }
    
    return (
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 1200, bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setSelectedMobileRoomId(null)} sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'text.primary' }}>
              {group.room.name || 'Oda'}
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <Box sx={{ width: 'fit-content', mx: 'auto' }}>
            <EditableRoomCard
              room={group.room}
              tables={group.tables}
              isDark={isDark}
              onTableMove={onTableMove}
              onTableDelete={onTableDelete}
              onTableEdit={onTableEdit}
              onTableAdd={onTableAdd}
              onRoomEdit={onRoomEdit}
              onRoomResize={onRoomResize}
            />
          </Box>
        </Box>
      </Box>
    );
  }

  // Mobile Room Selection List
  if (isMobile) {
    return (
      <Stack spacing={3}>
        {byFloor.map(([f, fgroups]) => (
          <Box key={f}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: 'text.primary' }}>
              {f}. Kat
            </Typography>
            <Stack spacing={2}>
              {fgroups.map(g => {
                const catMeta = g.room.category ? categoryMeta[g.room.category] : null;
                const accent = catMeta?.color ?? g.room.color ?? '#7E7E85';
                const count = g.tables.length;
                return (
                  <ButtonBase
                    key={g.room.id}
                    onClick={() => setSelectedMobileRoomId(g.room.id)}
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
      </Stack>
    );
  }

  // Desktop View
  return (
    <Stack spacing={3}>
      {byFloor.map(([f, fgroups]) => {
        // Calculate dynamic canvas size from room positions
        const CELL = 52;
        const VISUAL_OFFSET_X = 52;
        const VISUAL_OFFSET_Y = 52;
        const maxCol = Math.max(0, ...fgroups.map(g => (g.room.floor_col ?? 0) + (g.room.col_span ?? 1)));
        const maxRow = Math.max(0, ...fgroups.map(g => (g.room.floor_row ?? 0) + (g.room.row_span ?? 1)));
        // Add VISUAL_OFFSET for the top/left margin, plus extra space for floating controls (+100px)
        const canvasW = maxCol * CELL + VISUAL_OFFSET_X + 100;
        const canvasH = maxRow * CELL + VISUAL_OFFSET_Y + 52;

        return (
          <Box key={f}>
            <Stack direction="row" spacing={2} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  color: 'text.primary',
                }}
              >
                {f}. Kat
              </Typography>
              {onRoomQuickAdd && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => onRoomQuickAdd(f)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    py: 0.25,
                    fontSize: 12,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    }
                  }}
                >
                  Bölüm Ekle (2x2)
                </Button>
              )}
            </Stack>
            <Box
              onMouseMove={(e) => {
                if (placingRoom && placingRoom.floor === f) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const mouseY = e.clientY - rect.top;
                  const col = Math.max(0, Math.floor((mouseX - VISUAL_OFFSET_X) / CELL));
                  const row = Math.max(0, Math.floor((mouseY - VISUAL_OFFSET_Y) / CELL));
                  setHoverPos({ x: col, y: row });
                }
              }}
              onMouseLeave={() => {
                setHoverPos(null);
              }}
              onClick={(e) => {
                if (placingRoom && placingRoom.floor === f && hoverPos) {
                  e.stopPropagation();
                  handleRoomPlace(f, hoverPos.x, hoverPos.y);
                }
              }}
              sx={{
                position: 'relative',
                width: '100%',
                minHeight: canvasH,
                overflow: 'auto',
                p: 0,
                bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                borderRadius: 3,
                border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                backgroundImage: isDark
                  ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 0)'
                  : 'radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 0)',
                backgroundSize: `${CELL}px ${CELL}px`,
                backgroundPosition: `${VISUAL_OFFSET_X}px ${VISUAL_OFFSET_Y}px`,
                cursor: placingRoom && placingRoom.floor === f ? 'cell' : 'default',
              }}
            >
              {fgroups.map((g) => (
                <EditableRoomCard
                  key={g.room.id}
                  room={g.room}
                  tables={g.tables}
                  isDark={isDark}
                  onTableMove={onTableMove}
                  onTableDelete={onTableDelete}
                  onTableEdit={onTableEdit}
                  onTableAdd={onTableAdd}
                  onRoomEdit={onRoomEdit}
                  onRoomResize={onRoomResize}
                  onRoomMove={handleRoomMove}
                />
              ))}

              {placingRoom && placingRoom.floor === f && hoverPos && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: hoverPos.x * CELL + VISUAL_OFFSET_X,
                    top: hoverPos.y * CELL + VISUAL_OFFSET_Y,
                    width: placingRoom.colSpan * CELL,
                    height: placingRoom.rowSpan * CELL,
                    bgcolor: 'rgba(34, 197, 94, 0.15)',
                    border: '2px dashed #22c55e',
                    borderRadius: 3,
                    pointerEvents: 'none',
                    zIndex: 1000,
                  }}
                />
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
