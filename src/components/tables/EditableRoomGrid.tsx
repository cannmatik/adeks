'use client';

import React from 'react';
import { Box } from '@mui/material';
import { CafeTable } from './TableCard';
import { MemoDraggableTile, CELL, GAP } from './EditableRoomTile';

interface Props {
  roomId: string;
  tables: CafeTable[];
  gridW: number;
  gridH: number;
  accent: string;
  isDark: boolean;
  onTableMove: (id: string, roomId: string, x: number, y: number) => void;
  onTableDelete: (id: string) => void;
  onTableEdit: (table: CafeTable) => void;
  onTableAdd: (roomId: string, x: number, y: number) => void;
}

export default function EditableRoomGrid({
  roomId,
  tables,
  gridW,
  gridH,
  accent,
  isDark,
  onTableMove,
  onTableDelete,
  onTableEdit,
  onTableAdd,
}: Props) {
  const innerW = gridW * CELL;
  const innerH = gridH * CELL;

  // Build a set of occupied positions for overlap detection
  const allOccupied = new Set(tables.map((t) => `${t.position_x},${t.position_y}`));

  return (
    <Box
      sx={{
        position: 'relative',
        width: innerW,
        height: innerH,
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / CELL);
        const y = Math.floor((e.clientY - rect.top) / CELL);
        // Prevent adding a table on an occupied cell
        if (allOccupied.has(`${x},${y}`)) return;
        onTableAdd(roomId, x, y);
      }}
    >
      {/* Grid lines background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isDark
            ? `
              linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
            `
            : `
              linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
            `,
          backgroundSize: `${CELL}px ${CELL}px`,
          backgroundPosition: `0px 0px`,
          pointerEvents: 'none',
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      />

      {/* Tables */}
      {tables.map((t) => {
        // Occupied positions excluding this table's own position
        const otherOccupied = new Set(
          tables.filter((o) => o.id !== t.id).map((o) => `${o.position_x},${o.position_y}`)
        );
        return (
          <MemoDraggableTile
            key={t.id}
            table={t}
            onMove={onTableMove}
            onDelete={onTableDelete}
            onEdit={onTableEdit}
            accent={accent}
            isDark={isDark}
            gridW={gridW}
            gridH={gridH}
            round={t.shape === 'ROUND'}
            occupiedPositions={otherOccupied}
          />
        );
      })}
    </Box>
  );
}
