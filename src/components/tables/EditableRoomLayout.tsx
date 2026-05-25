'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Delete, Edit, Add } from '@mui/icons-material';
import { CafeTable, RoomLite } from './TableCard';
import { CATEGORY_META } from '@/lib/categories';

interface Props {
  tables: CafeTable[];
  onTableMove: (id: string, roomId: string, x: number, y: number) => void;
  onTableDelete: (id: string) => void;
  onTableEdit: (table: CafeTable) => void;
  onTableAdd: (roomId: string, x: number, y: number) => void;
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

const TILE = 44;
const GAP = 8;
const CELL = TILE + GAP;

export default function EditableRoomLayout({
  tables,
  onTableMove,
  onTableDelete,
  onTableEdit,
  onTableAdd,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const groups = useMemo(() => groupByRoom(tables), [tables]);

  const byFloor = useMemo(() => {
    const map = new Map<string, Group[]>();
    for (const g of groups) {
      const f = g.room.floor ?? '1';
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [groups]);

  // Grid hover highlight (her oda için ayrı değil, global)
  const [hoveredCell, setHoveredCell] = useState<{
    roomId: string;
    x: number;
    y: number;
  } | null>(null);

  if (groups.length === 0) return null;

  const sectionContent = (fgroups: Group[]) => (
    <Box
      sx={{
        display: 'flex',
        flexWrap: isMobile ? 'nowrap' : 'wrap',
        gap: 2,
        overflowX: isMobile ? 'auto' : undefined,
        pb: isMobile ? 1 : undefined,
        alignItems: 'flex-start',
      }}
    >
      {fgroups.map((g) => {
        const catMeta = g.room.category ? CATEGORY_META[g.room.category] : null;
        const accent = catMeta?.color ?? g.room.color ?? '#7E7E85';
        const short = catMeta?.short ?? g.room.name?.slice(0, 2).toUpperCase() ?? '??';
        const sectionLabel = catMeta
          ? `${short}${g.room.display_order + 1}`
          : g.room.name ?? 'Oda';

        const innerMaxX = Math.max(0, ...g.tables.map((t) => t.position_x));
        const innerMaxY = Math.max(0, ...g.tables.map((t) => t.position_y));
        const gridW = Math.max(innerMaxX + 1, 8);
        const gridH = Math.max(innerMaxY + 1, 5);
        const innerW = gridW * CELL - GAP;
        const innerH = gridH * CELL - GAP;
        const padX = 20;
        const padY = 40;

        const occupied = new Set(
          g.tables.map((t) => `${t.position_x},${t.position_y}`),
        );

        return (
          <Paper
            key={g.room.id}
            elevation={0}
            sx={{
              position: 'relative',
              borderRadius: 2.5,
              bgcolor: isDark ? '#16161C' : '#F8F8FA',
              border: `1.5px solid ${accent}35`,
              p: 0,
              flexShrink: 0,
              width: innerW + padX,
              minHeight: innerH + padY,
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                borderColor: `${accent}60`,
                boxShadow: `0 4px 20px ${accent}18`,
              },
            }}
          >
            {/* Header */}
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 10,
                right: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  px: 0.75,
                  py: 0.2,
                  borderRadius: 0.5,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: accent,
                  bgcolor: isDark ? '#0E0E12' : '#FFFFFF',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {sectionLabel}
              </Box>
              <Tooltip title="Bu bölüme masa ekle">
                <IconButton
                  size="small"
                  sx={{ color: accent }}
                  onClick={() => {
                    let found = false;
                    for (let y = 0; y < gridH && !found; y++) {
                      for (let x = 0; x < gridW && !found; x++) {
                        if (!occupied.has(`${x},${y}`)) {
                          onTableAdd(g.room.id, x, y);
                          found = true;
                        }
                      }
                    }
                    if (!found) onTableAdd(g.room.id, gridW, 0);
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Grid Container */}
            <Box
              sx={{
                position: 'relative',
                width: innerW,
                height: innerH,
                mx: 'auto',
                mt: '28px',
                mb: '12px',
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = Math.floor((e.clientX - rect.left) / CELL);
                const y = Math.floor((e.clientY - rect.top) / CELL);
                if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
                  setHoveredCell({ roomId: g.room.id, x, y });
                }
              }}
              onMouseLeave={() => setHoveredCell(null)}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = Math.floor((e.clientX - rect.left) / CELL);
                const y = Math.floor((e.clientY - rect.top) / CELL);
                onTableAdd(g.room.id, x, y);
              }}
            >
              {/* Grid dots background */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: isDark
                    ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)'
                    : 'radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)',
                  backgroundSize: `${CELL}px ${CELL}px`,
                  backgroundPosition: '0 0',
                  pointerEvents: 'none',
                }}
              />

              {/* Hover highlight */}
              {hoveredCell?.roomId === g.room.id &&
                !occupied.has(`${hoveredCell.x},${hoveredCell.y}`) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: hoveredCell.x * CELL,
                      top: hoveredCell.y * CELL,
                      width: TILE,
                      height: TILE,
                      borderRadius: 1.5,
                      border: '2px dashed',
                      borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)',
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      pointerEvents: 'none',
                      zIndex: 0,
                      transition: 'left 0.05s, top 0.05s',
                    }}
                  />
                )}

              {/* Tables */}
              {g.tables.map((t) => (
                <DraggableTile
                  key={t.id}
                  table={t}
                  onMove={onTableMove}
                  onDelete={onTableDelete}
                  onEdit={onTableEdit}
                  accent={accent}
                  isDark={isDark}
                />
              ))}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );

  return (
    <Stack spacing={3}>
      {byFloor.map(([f, fgroups]) => (
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
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, md: 2.5 },
              bgcolor: isDark ? '#0E0E12' : theme.palette.background.paper,
              borderRadius: 3,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : theme.palette.divider}`,
              overflowX: 'auto',
            }}
          >
            {sectionContent(fgroups)}
          </Paper>
        </Box>
      ))}
    </Stack>
  );
}

function DraggableTile({
  table,
  onMove,
  onDelete,
  onEdit,
  accent,
  isDark,
}: {
  table: CafeTable;
  onMove: (id: string, roomId: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onEdit: (table: CafeTable) => void;
  accent: string;
  isDark: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const pos = useRef({
    x: table.position_x * CELL,
    y: table.position_y * CELL,
  });
  const start = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    pos.current = {
      x: table.position_x * CELL,
      y: table.position_y * CELL,
    };
    setPreviewPos(null);
  }, [table.position_x, table.position_y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    start.current = {
      mx: e.clientX,
      my: e.clientY,
      px: pos.current.x,
      py: pos.current.y,
    };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      pos.current = {
        x: start.current.px + dx,
        y: start.current.py + dy,
      };
      const snapX = Math.max(0, Math.round(pos.current.x / CELL)) * CELL;
      const snapY = Math.max(0, Math.round(pos.current.y / CELL)) * CELL;
      setPreviewPos({ x: snapX, y: snapY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setDragging(false);
      setPreviewPos(null);
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      const finalX = start.current.px + dx;
      const finalY = start.current.py + dy;
      const newX = Math.max(0, Math.round(finalX / CELL));
      const newY = Math.max(0, Math.round(finalY / CELL));
      if (newX !== table.position_x || newY !== table.position_y) {
        onMove(table.id, table.room?.id || '', newX, newY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, table.id, table.position_x, table.position_y, table.room?.id, onMove]);

  const meta = CATEGORY_META[table.category] ?? {
    label: table.category ?? 'Bilinmeyen',
    short: (table.category ?? '?').slice(0, 2),
    color: '#7E7E85',
  };

  const statusColors: Record<string, { bg: string; fg: string; border: string }> = {
    AVAILABLE: { bg: isDark ? '#0E0E12' : '#FFFFFF', fg: isDark ? '#FFF' : '#111', border: meta.color },
    OCCUPIED: { bg: isDark ? '#27272A' : '#E4E4E7', fg: isDark ? '#FFF' : '#52525B', border: '#71717A' },
    MAINTENANCE: { bg: isDark ? '#27272A' : '#E4E4E7', fg: isDark ? '#A1A1AA' : '#52525B', border: '#71717A' },
  };

  const sc = statusColors[table.status] || statusColors.AVAILABLE;

  return (
    <Box
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: 'absolute',
        left: pos.current.x,
        top: pos.current.y,
        width: TILE,
        height: TILE,
        cursor: dragging ? 'grabbing' : 'grab',
        zIndex: dragging ? 100 : hovered ? 10 : 1,
        userSelect: 'none',
      }}
    >
      {/* Snap Preview */}
      {dragging && previewPos && (
        <Box
          sx={{
            position: 'absolute',
            left: previewPos.x - pos.current.x,
            top: previewPos.y - pos.current.y,
            width: TILE,
            height: TILE,
            borderRadius: 1.5,
            border: '2px dashed',
            borderColor: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.25)',
            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}

      {/* Sil / Düzenle butonları */}
      {(hovered || dragging) && (
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -8,
            display: 'flex',
            gap: 0.2,
            zIndex: 101,
          }}
        >
          <IconButton
            size="small"
            sx={{
              bgcolor: 'background.paper',
              width: 20,
              height: 20,
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(table);
            }}
          >
            <Edit sx={{ fontSize: 12 }} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            sx={{
              bgcolor: 'background.paper',
              width: 20,
              height: 20,
              '&:hover': { bgcolor: 'error.lighter' },
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Masa #${table.number} silinsin mi?`)) {
                onDelete(table.id);
              }
            }}
          >
            <Delete sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
      )}

      {/* Masa tile */}
      <Tooltip arrow title={`Masa #${table.number} — ${meta.label}`}>
        <Box
          sx={{
            width: TILE,
            height: TILE,
            bgcolor: sc.bg,
            color: sc.fg,
            border: `2px solid ${sc.border}`,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: dragging
              ? `0 8px 24px ${sc.border}55`
              : '0 1px 2px rgba(0,0,0,0.06)',
            transform: dragging ? 'scale(1.08)' : undefined,
          }}
        >
          {table.number}
        </Box>
      </Tooltip>
    </Box>
  );
}
