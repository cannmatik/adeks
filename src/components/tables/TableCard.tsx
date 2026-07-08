'use client';

import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Bolt, SupportAgent, RoomService } from '@mui/icons-material';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  TableCategory,
  TableStatus,
} from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';
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
  short_code?: string | null;
}

export type BookingStatus = 'AVAILABLE' | 'HOLD' | 'CONFIRMED' | 'IN_USE'

export interface CafeTable {
  id: string;
  number: number;
  category: TableCategory;
  status: TableStatus;
  shape: string;
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
    needs_support?: boolean;
    has_pending_order?: boolean;
  } | null;
}

interface Props {
  table: CafeTable;
  onReserve?: (table: CafeTable) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function TableCard({ table, onReserve, disabled, compact }: Props) {
  const { categoryMeta } = useCategories();
  const meta = categoryMeta[table.category] ?? {
    label: table.category,
    color: '#C0C0C0',
    defaultRate: 0,
    description: '',
  };
  const isAvailable = table.status === 'AVAILABLE';
  const rate = table.hourly_rate != null ? Number(table.hourly_rate) : meta.defaultRate;
  let borderColor = meta.color + '40';
  let gradientColor = meta.color;
  
  if (table.session?.needs_support) {
    borderColor = '#EF4444'; // Red
    gradientColor = '#EF4444';
  } else if (table.session?.has_pending_order) {
    borderColor = '#F59E0B'; // Amber
    gradientColor = '#F59E0B';
  }

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderColor: borderColor,
        borderWidth: (table.session?.needs_support || table.session?.has_pending_order) ? 2 : 1,
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
          background: `linear-gradient(90deg, ${gradientColor}, ${gradientColor}55)`,
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
            {table.session?.needs_support && (
              <Chip size="small" icon={<SupportAgent fontSize="small" />} label="Destek Talebi" color="error" sx={{ mt: 0.5, fontWeight: 'bold' }} />
            )}
            {table.session?.has_pending_order && !table.session?.needs_support && (
              <Chip size="small" icon={<RoomService fontSize="small" />} label="Yeni Sipariş" color="warning" sx={{ mt: 0.5, fontWeight: 'bold' }} />
            )}
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
