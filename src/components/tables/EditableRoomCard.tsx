'use client';

import React from 'react';
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { Settings, Add, ArrowBack, ArrowForward, ArrowUpward, ArrowDownward, DragIndicator, Edit, Close, TableRestaurant } from '@mui/icons-material';
import { CafeTable, RoomLite } from './TableCard';
import { useCategories } from '@/components/CategoryProvider';
import EditableRoomGrid from './EditableRoomGrid';
import { CELL, GAP } from './EditableRoomTile';

interface Props {
  room: RoomLite;
  tables: CafeTable[];
  isDark: boolean;
  onTableMove: (id: string, roomId: string, x: number, y: number) => void;
  onTableDelete: (id: string) => void;
  onTableEdit: (table: CafeTable) => void;
  onTableAdd: (roomId: string, x: number, y: number) => void;
  onRoomEdit?: (room: RoomLite) => void;
  onRoomResize?: (roomId: string, colSpan: number, rowSpan: number) => void;
  onRoomMove?: (roomId: string, floorCol: number, floorRow: number) => void;
}

export default function EditableRoomCard({
  room,
  tables,
  isDark,
  onTableMove,
  onTableDelete,
  onTableEdit,
  onTableAdd,
  onRoomEdit,
  onRoomResize,
  onRoomMove,
}: Props) {
  // Per-room edit mode
  const [isEditing, setIsEditing] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const [previewPos, setPreviewPos] = React.useState<{ x: number; y: number } | null>(null);
  const start = React.useRef({ mx: 0, my: 0 });

  const { categoryMeta } = useCategories();
  const catMeta = room.category ? categoryMeta[room.category] : null;
  const accent = catMeta?.color ?? room.color ?? '#7E7E85';
  const short = catMeta?.short ?? room.name?.slice(0, 2).toUpperCase() ?? '??';
  const sectionLabel = catMeta ? `${short}${room.display_order + 1}` : room.name ?? 'Oda';

  const gridW = Math.max(room.col_span ?? 8, 1, ...tables.map((t) => t.position_x + 1));
  const gridH = Math.max(room.row_span ?? 5, 1, ...tables.map((t) => t.position_y + 1));
  
  const innerW = gridW * CELL;
  const innerH = gridH * CELL;

  // Keep HEADER_H constant so grid doesn't jump in edit mode
  const HEADER_H = 28;
  const cardW = innerW;
  const cardH = innerH + HEADER_H;

  // Always use absolute positioning based on floor coordinates
  const VISUAL_OFFSET_X = 52;
  const VISUAL_OFFSET_Y = 52;
  const startX = (room.floor_col ?? 0) * CELL + VISUAL_OFFSET_X;
  const startY = (room.floor_row ?? 0) * CELL + VISUAL_OFFSET_Y;

  React.useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setPreviewPos(null);
    setDragging(false);
  }, [room.floor_col, room.floor_row]);

  // Close edit mode on Escape
  React.useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!onRoomMove || !isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    start.current = { mx: e.clientX, my: e.clientY };
    setDragOffset({ x: 0, y: 0 });
  };

  React.useEffect(() => {
    if (!dragging || !onRoomMove || !isEditing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      
      const cappedDx = Math.max(VISUAL_OFFSET_X - startX, dx);
      const cappedDy = Math.max(VISUAL_OFFSET_Y - startY, dy);
      
      setDragOffset({ x: cappedDx, y: cappedDy });

      const snapX = Math.round((startX + cappedDx) / CELL) * CELL;
      const snapY = Math.round((startY + cappedDy) / CELL) * CELL;
      setPreviewPos({ x: snapX, y: snapY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setDragging(false);
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      
      const cappedDx = Math.max(VISUAL_OFFSET_X - startX, dx);
      const cappedDy = Math.max(VISUAL_OFFSET_Y - startY, dy);
      
      const newX = Math.round((startX + cappedDx - VISUAL_OFFSET_X) / CELL);
      const newY = Math.round((startY + cappedDy - VISUAL_OFFSET_Y) / CELL);

      setDragOffset({ x: 0, y: 0 });
      setPreviewPos(null);

      if (newX !== room.floor_col || newY !== room.floor_row) {
        onRoomMove(room.id, Math.max(0, newX), Math.max(0, newY));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, startX, startY, room.id, room.floor_col, room.floor_row, onRoomMove, isEditing]);

  const occupied = new Set(tables.map((t) => `${t.position_x},${t.position_y}`));
  const hasEditControls = !!(onRoomResize || onRoomMove || onRoomEdit);

  return (
    <>
      {/* Drag ghost preview */}
      {isEditing && dragging && previewPos && onRoomMove && (
        <Box
          sx={{
            position: 'absolute',
            left: previewPos.x,
            top: previewPos.y,
            width: cardW,
            height: cardH,
            bgcolor: `${accent}15`,
            border: `2px dashed ${accent}`,
            borderRadius: 3,
            zIndex: 500,
            pointerEvents: 'none',
            transition: 'all 0.1s ease',
          }}
        />
      )}
      <Paper
        elevation={0}
        sx={{
          // Always use absolute positioning on the floor grid
          position: 'absolute',
          left: startX + dragOffset.x,
          top: startY + dragOffset.y,
          zIndex: isEditing ? (dragging ? 1000 : 100) : 1,
          borderRadius: 0,
          bgcolor: isDark ? '#16161C' : '#FFFFFF',
          p: 0,
          width: cardW,
          height: cardH,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isEditing
            ? (isDark ? `0 8px 30px ${accent}30` : `0 6px 24px ${accent}20`)
            : (isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.04)'),
          transition: dragging ? 'none' : 'all 0.25s ease',
          overflow: isEditing ? 'visible' : 'hidden',
          border: `1.5px solid ${accent}${isEditing ? '60' : '30'}`,
          '&:hover': {
            borderColor: `${accent}60`,
            boxShadow: isDark ? `0 8px 30px ${accent}20` : `0 6px 20px ${accent}15`,
          },
        }}
      >
        {/* ===== EDITING MODE: Floating header with controls ===== */}
        {isEditing && (
          <Box
            sx={{
              position: 'absolute',
              top: -36,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
              bgcolor: isDark ? '#1A1A22' : '#FAFAFA',
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              border: `1px solid ${accent}50`,
              boxShadow: `0 2px 8px ${accent}20`,
              minWidth: 140,
              gap: 0.5,
            }}
          >
            <Box
              sx={{
                px: 0.5,
                py: 0.1,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: accent,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {sectionLabel}
            </Box>
            {onRoomMove && (
              <Box
                onMouseDown={handleDragStart}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: dragging ? 'grabbing' : 'grab',
                  opacity: 0.5,
                  '&:hover': { opacity: 1 },
                }}
              >
                <DragIndicator sx={{ fontSize: 14 }} />
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
              {onRoomEdit && (
                <Tooltip title="Bölümü düzenle">
                  <IconButton size="small" sx={{ color: accent, width: 20, height: 20 }} onClick={() => onRoomEdit(room)}>
                    <Settings sx={{ fontSize: 12 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Masa ekle">
                <IconButton
                  size="small"
                  sx={{ color: accent, width: 20, height: 20 }}
                  onClick={() => {
                    let found = false;
                    for (let y = 0; y < gridH && !found; y++) {
                      for (let x = 0; x < gridW && !found; x++) {
                        if (!occupied.has(`${x},${y}`)) {
                          onTableAdd(room.id, x, y);
                          found = true;
                        }
                      }
                    }
                    if (!found) onTableAdd(room.id, gridW, 0);
                  }}
                >
                  <Add sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              {/* Close edit mode */}
              <Tooltip title="Düzenlemeyi kapat">
                <IconButton size="small" sx={{ color: 'text.secondary', width: 20, height: 20 }} onClick={() => setIsEditing(false)}>
                  <Close sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* Keep the 28px offset when editing so the grid doesn't jump */}
        {isEditing && (
          <Box sx={{ height: HEADER_H, flexShrink: 0 }} />
        )}

        {/* ===== NON-EDITING MODE: Clean inline header ===== */}
        {!isEditing && (
          <Box
            sx={{
              height: HEADER_H,
              display: 'flex',
              alignItems: 'center',
              px: gridW < 3 ? 0.6 : 1.5,
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
            {gridW >= 3 && (
              <Stack
                direction="row"
                spacing={0.3}
                sx={{
                  alignItems: 'center',
                  ml: 1,
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
                  {tables.length}
                </Typography>
                <TableRestaurant sx={{ fontSize: 13, opacity: 0.8 }} />
              </Stack>
            )}
            {/* Per-room edit button */}
            {hasEditControls && (
              <Tooltip title="Bu bölümü düzenle">
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(true)}
                  sx={{
                    ml: 'auto',
                    color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                    width: 20,
                    height: 20,
                    '&:hover': { color: accent },
                  }}
                >
                  <Edit sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

        {/* Grid */}
        <EditableRoomGrid
          roomId={room.id}
          tables={tables}
          gridW={gridW}
          gridH={gridH}
          accent={accent}
          isDark={isDark}
          onTableMove={onTableMove}
          onTableDelete={onTableDelete}
          onTableEdit={onTableEdit}
          onTableAdd={onTableAdd}
        />

        {/* Resize controls footer (editing only) */}
        {isEditing && onRoomResize && (
          <Box
            sx={{
              position: 'absolute',
              bottom: -36,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
              py: 0.3,
              px: 1,
              bgcolor: isDark ? '#1A1A22' : '#FAFAFA',
              borderRadius: 1.5,
              border: `1px solid ${accent}50`,
              boxShadow: `0 2px 8px ${accent}20`,
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center' }}>
              <Tooltip title="Sütun çıkar">
                <IconButton
                  size="small"
                  sx={{ width: 24, height: 24, color: accent, bgcolor: isDark ? `${accent}18` : `${accent}10`, borderRadius: 0.5, border: `1px solid ${accent}30`, '&:hover': { bgcolor: isDark ? `${accent}28` : `${accent}18` } }}
                  onClick={() => onRoomResize(room.id, Math.max(1, gridW - 1), gridH)}
                >
                  <ArrowBack sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 10, color: accent, minWidth: 14, textAlign: 'center' }}>
                {gridW}
              </Typography>
              <Tooltip title="Sütun ekle">
                <IconButton
                  size="small"
                  sx={{ width: 24, height: 24, color: accent, bgcolor: isDark ? `${accent}18` : `${accent}10`, borderRadius: 0.5, border: `1px solid ${accent}30`, '&:hover': { bgcolor: isDark ? `${accent}28` : `${accent}18` } }}
                  onClick={() => onRoomResize(room.id, gridW + 1, gridH)}
                >
                  <ArrowForward sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center' }}>
              <Tooltip title="Satır çıkar">
                <IconButton
                  size="small"
                  sx={{ width: 24, height: 24, color: accent, bgcolor: isDark ? `${accent}18` : `${accent}10`, borderRadius: 0.5, border: `1px solid ${accent}30`, '&:hover': { bgcolor: isDark ? `${accent}28` : `${accent}18` } }}
                  onClick={() => onRoomResize(room.id, gridW, Math.max(1, gridH - 1))}
                >
                  <ArrowUpward sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 10, color: accent, minWidth: 14, textAlign: 'center' }}>
                {gridH}
              </Typography>
              <Tooltip title="Satır ekle">
                <IconButton
                  size="small"
                  sx={{ width: 24, height: 24, color: accent, bgcolor: isDark ? `${accent}18` : `${accent}10`, borderRadius: 0.5, border: `1px solid ${accent}30`, '&:hover': { bgcolor: isDark ? `${accent}28` : `${accent}18` } }}
                  onClick={() => onRoomResize(room.id, gridW, gridH + 1)}
                >
                  <ArrowDownward sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        )}
      </Paper>
    </>
  );
}
