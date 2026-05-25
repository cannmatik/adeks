'use client';

import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Bolt } from '@mui/icons-material';
import {
  CATEGORY_META,
  STATUS_COLOR,
  STATUS_LABEL,
  TableCategory,
  TableStatus,
} from '@/lib/categories';
import CategoryBadge from './CategoryBadge';

export interface RoomLite {
  id: string;
  name: string;
  description?: string | null;
  color: string | null;
  display_order: number;
  floor: string;
  floor_col: number;
  floor_row: number;
  col_span: number;
  row_span: number;
  category: TableCategory | null;
}

export type BookingStatus = 'AVAILABLE' | 'HOLD' | 'CONFIRMED' | 'IN_USE'

export interface CafeTable {
  id: string;
  number: number;
  category: TableCategory;
  status: TableStatus;
  booking_status?: BookingStatus;
  hourly_rate: number | string | null;
  position_x: number;
  position_y: number;
  notes: string | null;
  room: RoomLite | null;
  session?: {
    kind: 'MEMBER' | 'ANONYMOUS';
    user_name?: string | null;
    elapsed?: string;
    estimated?: string;
  } | null;
}

interface Props {
  table: CafeTable;
  onReserve?: (table: CafeTable) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function TableCard({ table, onReserve, disabled, compact }: Props) {
  const meta = CATEGORY_META[table.category];
  const isAvailable = table.status === 'AVAILABLE';
  const rate = table.hourly_rate != null ? Number(table.hourly_rate) : meta.defaultRate;

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderColor: meta.color + '40',
        '&:hover': isAvailable ? { transform: 'translateY(-2px)' } : undefined,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${meta.color}, ${meta.color}55)`,
        }}
      />
      <CardContent sx={{ pt: compact ? 2 : 3, pb: compact ? 1.5 : undefined }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              MASA
            </Typography>
            <Typography variant={compact ? 'h4' : 'h3'} sx={{ fontWeight: 800, lineHeight: 1, color: meta.color }}>
              {table.number}
            </Typography>
          </Box>
          <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
            <CategoryBadge category={table.category} />
            <Chip
              label={STATUS_LABEL[table.status]}
              color={STATUS_COLOR[table.status]}
              size="small"
              variant={isAvailable ? 'filled' : 'outlined'}
            />
          </Stack>
        </Stack>

        {!compact && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, minHeight: 40 }}>
            {meta.description}
          </Typography>
        )}

        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant={compact ? 'body1' : 'h6'} sx={{ fontWeight: 700 }}>
            {rate.toFixed(0)} ₺
            <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
              /saat
            </Typography>
          </Typography>
          {onReserve && (
            <Button
              variant={isAvailable ? 'contained' : 'outlined'}
              size="small"
              startIcon={<Bolt />}
              onClick={() => onReserve(table)}
              disabled={disabled || !isAvailable}
            >
              Rezerve Et
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
