'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { CafeTable } from './TableCard';
import { useCategories } from '@/components/CategoryProvider';

export const TILE = 40;
export const GAP = 12;
export const CELL = TILE + GAP;
const CLICK_MOVE_THRESHOLD = 4;

interface Props {
  table: CafeTable;
  onMove: (id: string, roomId: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onEdit: (table: CafeTable) => void;
  accent: string;
  isDark: boolean;
  gridW: number;
  gridH: number;
  round?: boolean;
  occupiedPositions?: Set<string>;
}

function DraggableTile({
  table,
  onMove,
  onEdit,
  isDark,
  gridW,
  gridH,
  round,
  occupiedPositions,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [isOverlapping, setIsOverlapping] = useState(false);

  const startGridX = table.position_x * CELL;
  const startGridY = table.position_y * CELL;
  const baseX = startGridX + GAP / 2;
  const baseY = startGridY + GAP / 2;
  const start = useRef({ mx: 0, my: 0 });
  const moved = useRef(false);

  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setPreviewPos(null);
    setDragging(false);
    setIsOverlapping(false);
  }, [table.position_x, table.position_y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    moved.current = false;
    start.current = { mx: e.clientX, my: e.clientY };
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      if (Math.abs(dx) > CLICK_MOVE_THRESHOLD || Math.abs(dy) > CLICK_MOVE_THRESHOLD) {
        moved.current = true;
      }
      setDragOffset({ x: dx, y: dy });

      const snapX = Math.max(0, Math.min(gridW - 1, Math.round((startGridX + dx) / CELL)));
      const snapY = Math.max(0, Math.min(gridH - 1, Math.round((startGridY + dy) / CELL)));
      const snapGridX = snapX * CELL;
      const snapGridY = snapY * CELL;
      setPreviewPos({ x: snapGridX + GAP / 2, y: snapGridY + GAP / 2 });

      // Check if snapped position is occupied
      if (occupiedPositions) {
        setIsOverlapping(occupiedPositions.has(`${snapX},${snapY}`));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setDragging(false);
      setIsOverlapping(false);

      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      const wasMoved =
        moved.current ||
        Math.abs(dx) > CLICK_MOVE_THRESHOLD ||
        Math.abs(dy) > CLICK_MOVE_THRESHOLD;
      const finalGridX = startGridX + dx;
      const finalGridY = startGridY + dy;
      const newX = Math.max(0, Math.min(gridW - 1, Math.round(finalGridX / CELL)));
      const newY = Math.max(0, Math.min(gridH - 1, Math.round(finalGridY / CELL)));

      setDragOffset({ x: 0, y: 0 });
      setPreviewPos(null);
      moved.current = false;

      if (!wasMoved) {
        onEdit(table);
        return;
      }

      // Block move if target is occupied
      if (occupiedPositions && occupiedPositions.has(`${newX},${newY}`)) {
        return;
      }

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
  }, [dragging, gridW, gridH, onEdit, onMove, startGridX, startGridY, table, occupiedPositions]);

  const { categoryMeta } = useCategories();
  const meta = categoryMeta[table.category] ?? {
    label: table.category ?? 'Bilinmeyen',
    short: (table.category ?? '?').slice(0, 2),
    color: '#7E7E85',
  };

  const isGarden = table.category === 'GARDEN';
  const statusColors: Record<string, { bg: string; fg: string; border: string }> = {
    AVAILABLE: {
      bg: isGarden ? (isDark ? '#0E0E12' : '#FFFFFF') : meta.color,
      fg: isGarden ? (isDark ? '#FFF' : '#111') : '#FFFFFF',
      border: meta.color,
    },
    OCCUPIED: {
      bg: isDark ? '#27272A' : '#E4E4E7',
      fg: isDark ? '#FFF' : '#52525B',
      border: '#71717A',
    },
    MAINTENANCE: {
      bg: isDark ? '#27272A' : '#E4E4E7',
      fg: isDark ? '#A1A1AA' : '#52525B',
      border: '#71717A',
    },
  };

  const sc = statusColors[table.status] || statusColors.AVAILABLE;

  return (
    <Box
      onMouseDown={handleMouseDown}
      sx={{
        position: 'absolute',
        left: baseX,
        top: baseY,
        width: TILE,
        height: TILE,
        cursor: dragging ? 'grabbing' : 'grab',
        zIndex: dragging ? 100 : 1,
        userSelect: 'none',
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        transition: dragging ? 'none' : 'transform 0.15s ease',
      }}
      data-dragging={dragging}
      aria-label={`Masa #${table.number}`}
    >
      {dragging && previewPos && (
        <Box
          sx={{
            position: 'absolute',
            left: previewPos.x - baseX - dragOffset.x,
            top: previewPos.y - baseY - dragOffset.y,
            width: TILE,
            height: TILE,
            borderRadius: round ? '50%' : 1.5,
            border: '2px dashed',
            borderColor: isOverlapping
              ? 'rgba(239, 68, 68, 0.8)'
              : isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.25)',
            bgcolor: isOverlapping
              ? 'rgba(239, 68, 68, 0.15)'
              : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            pointerEvents: 'none',
            zIndex: -1,
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
          }}
        />
      )}

      <Box
        sx={{
          width: TILE,
          height: TILE,
          bgcolor: sc.bg,
          color: sc.fg,
          border: `2px solid ${sc.border}`,
          borderRadius: round ? '50%' : 1.5,
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
    </Box>
  );
}

export const MemoDraggableTile = React.memo(DraggableTile);
