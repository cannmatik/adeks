'use client';

import React from 'react';
import {
  Wc,
  Restaurant,
  LocalBar,
  DoorFront,
  Stairs,
  PointOfSale,
  Inventory2,
  Widgets,
} from '@mui/icons-material';

export interface FloorObjectItem {
  id: string;
  floor: string;
  kind: string;
  label: string | null;
  floor_col: number;
  floor_row: number;
  col_span: number;
  row_span: number;
}

export const OBJECT_KINDS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  WC: { label: 'WC', color: '#0EA5E9', icon: <Wc fontSize="inherit" /> },
  KITCHEN: { label: 'Mutfak', color: '#F97316', icon: <Restaurant fontSize="inherit" /> },
  BAR: { label: 'Bar', color: '#8B5CF6', icon: <LocalBar fontSize="inherit" /> },
  ENTRANCE: { label: 'Giriş', color: '#22C55E', icon: <DoorFront fontSize="inherit" /> },
  STAIRS: { label: 'Merdiven', color: '#64748B', icon: <Stairs fontSize="inherit" /> },
  CASHIER: { label: 'Kasa', color: '#EAB308', icon: <PointOfSale fontSize="inherit" /> },
  STORAGE: { label: 'Depo', color: '#78716C', icon: <Inventory2 fontSize="inherit" /> },
  OTHER: { label: 'Diğer', color: '#7E7E85', icon: <Widgets fontSize="inherit" /> },
};

export function objectMeta(kind: string) {
  return OBJECT_KINDS[kind] ?? OBJECT_KINDS.OTHER;
}

export function objectLabel(o: FloorObjectItem) {
  return o.label?.trim() || objectMeta(o.kind).label;
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
