'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { FloorObjectItem, objectMeta, objectLabel, rectsOverlap } from './objectMeta';

const CELL = 52;
const VISUAL_OFFSET_X = 52;
const VISUAL_OFFSET_Y = 52;
const CLICK_MOVE_THRESHOLD = 4;

interface Props {
  obj: FloorObjectItem;
  isDark: boolean;
  onMove: (id: string, floorCol: number, floorRow: number) => void;
  onEdit: (obj: FloorObjectItem) => void;
  blockedRects: Array<{ x: number; y: number; w: number; h: number }>;
}

function EditableFloorObject({ obj, isDark, onMove, onEdit, blockedRects }: Props) {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [isOverlapping, setIsOverlapping] = useState(false);
  const start = useRef({ mx: 0, my: 0 });
  const moved = useRef(false);

  const startX = obj.floor_col * CELL + VISUAL_OFFSET_X;
  const startY = obj.floor_row * CELL + VISUAL_OFFSET_Y;
  const w = obj.col_span * CELL;
  const h = obj.row_span * CELL;

  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
    setPreviewPos(null);
    setDragging(false);
    setIsOverlapping(false);
  }, [obj.floor_col, obj.floor_row]);

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

    const isBlocked = (col: number, row: number) =>
      blockedRects.some((r) => rectsOverlap({ x: col, y: row, w: obj.col_span, h: obj.row_span }, r));

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      if (Math.abs(dx) > CLICK_MOVE_THRESHOLD || Math.abs(dy) > CLICK_MOVE_THRESHOLD) {
        moved.current = true;
      }
      const cappedDx = Math.max(VISUAL_OFFSET_X - startX, dx);
      const cappedDy = Math.max(VISUAL_OFFSET_Y - startY, dy);
      setDragOffset({ x: cappedDx, y: cappedDy });

      const col = Math.max(0, Math.round((startX + cappedDx - VISUAL_OFFSET_X) / CELL));
      const row = Math.max(0, Math.round((startY + cappedDy - VISUAL_OFFSET_Y) / CELL));
      setPreviewPos({ x: col * CELL + VISUAL_OFFSET_X, y: row * CELL + VISUAL_OFFSET_Y });
      setIsOverlapping(isBlocked(col, row));
    };

    const handleMouseUp = (e: MouseEvent) => {
      setDragging(false);
      setIsOverlapping(false);

      const dx = e.clientX - start.current.mx;
      const dy = e.clientY - start.current.my;
      const wasMoved =
        moved.current || Math.abs(dx) > CLICK_MOVE_THRESHOLD || Math.abs(dy) > CLICK_MOVE_THRESHOLD;

      const cappedDx = Math.max(VISUAL_OFFSET_X - startX, dx);
      const cappedDy = Math.max(VISUAL_OFFSET_Y - startY, dy);
      const col = Math.max(0, Math.round((startX + cappedDx - VISUAL_OFFSET_X) / CELL));
      const row = Math.max(0, Math.round((startY + cappedDy - VISUAL_OFFSET_Y) / CELL));

      setDragOffset({ x: 0, y: 0 });
      setPreviewPos(null);
      moved.current = false;

      if (!wasMoved) {
        onEdit(obj);
        return;
      }
      if (isBlocked(col, row)) return;
      if (col !== obj.floor_col || row !== obj.floor_row) {
        onMove(obj.id, col, row);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, obj, onEdit, onMove, startX, startY, blockedRects]);

  const meta = objectMeta(obj.kind);
  const label = objectLabel(obj);

  return (
    <>
      {dragging && previewPos && (
        <Box
          sx={{
            position: 'absolute',
            left: previewPos.x,
            top: previewPos.y,
            width: w,
            height: h,
            borderRadius: 2,
            border: '2px dashed',
            borderColor: isOverlapping ? 'rgba(239,68,68,0.8)' : `${meta.color}80`,
            bgcolor: isOverlapping ? 'rgba(239,68,68,0.12)' : `${meta.color}15`,
            zIndex: 500,
            pointerEvents: 'none',
          }}
        />
      )}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          left: startX + dragOffset.x,
          top: startY + dragOffset.y,
          width: w,
          height: h,
          zIndex: dragging ? 1000 : 2,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          transition: dragging ? 'none' : 'left 0.2s ease, top 0.2s ease',
        }}
        aria-label={label}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: isDark ? `${meta.color}14` : `${meta.color}0D`,
            border: `1.5px dashed ${meta.color}90`,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            color: meta.color,
            fontSize: 22,
            overflow: 'hidden',
            boxShadow: dragging ? `0 8px 24px ${meta.color}44` : 'none',
            transform: dragging ? 'scale(1.03)' : undefined,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
        >
          {meta.icon}
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: meta.color,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '90%',
            }}
          >
            {label}
          </Typography>
        </Box>
      </Box>
    </>
  );
}

export default React.memo(EditableFloorObject);
