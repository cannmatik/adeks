'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  Cancel,
  Chat,
  Edit,
  Event,
  Group,
  StickyNote2,
} from '@mui/icons-material';
import CategoryBadge from '@/components/tables/CategoryBadge';
import {
  CATEGORY_META,
  RESERVATION_COLOR,
  RESERVATION_LABEL,
  ReservationStatus,
  TableCategory,
} from '@/lib/categories';

interface RTable {
  table: { id: string; number: number; category: TableCategory };
}
interface RParticipant {
  user: { id: string; full_name: string | null; email: string | null } | null;
}

export interface ReservationRow {
  id: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  notes: string | null;
  contact_phone: string | null;
  user_id: string;
  owner?: { id: string; full_name: string | null; email: string | null } | null;
  tables: RTable[];
  participants: RParticipant[];
}

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const fmtDate = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const fmtTime = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const fmtShortDate = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
  });
  if (sameDay)
    return `${fmtDate.format(s)} · ${fmtTime.format(s)} – ${fmtTime.format(e)}`;
  return `${fmtShortDate.format(s)} ${fmtTime.format(s)} → ${fmtShortDate.format(
    e
  )} ${fmtTime.format(e)}`;
}

function durationHours(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, ms / 3_600_000);
}

interface Props {
  reservation: ReservationRow;
  showOwner?: boolean;
  onCancel?: (id: string) => void;
  onEdit?: (r: ReservationRow) => void;
  onOpenMessages?: (id: string) => void;
  actions?: React.ReactNode;
}

export default function ReservationCard({
  reservation: r,
  showOwner,
  onCancel,
  onEdit,
  onOpenMessages,
  actions,
}: Props) {
  const statusColor = RESERVATION_COLOR[r.status];
  const statusLabel = RESERVATION_LABEL[r.status];
  const cancelable =
    r.status === 'HOLD' || r.status === 'CONFIRMED' || r.status === 'REQUESTED';
  const editable = r.status === 'HOLD' || r.status === 'REQUESTED';
  const hours = durationHours(r.start_time, r.end_time);
  const totalRate = r.tables.reduce(
    (sum, rt) => sum + CATEGORY_META[rt.table.category].defaultRate,
    0
  );
  const estimatedTotal = Math.round(hours * totalRate);

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderLeft: '4px solid',
        borderColor: `${statusColor}.main`,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Üst satır: Durum + Actions */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1.5,
          }}
        >
          <Chip
            size="small"
            label={statusLabel}
            color={statusColor}
            sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
          />
          <Stack direction="row" spacing={0.5}>
            {actions}
            {onEdit && editable && (
              <IconButton size="small" onClick={() => onEdit(r)}>
                <Edit fontSize="small" />
              </IconButton>
            )}
            {onOpenMessages && (
              <IconButton
                size="small"
                color="primary"
                onClick={() => onOpenMessages(r.id)}
                title="Mesajlar"
              >
                <Chat fontSize="small" />
              </IconButton>
            )}
            {onCancel && cancelable && (
              <IconButton
                size="small"
                color="error"
                onClick={() => onCancel(r.id)}
              >
                <Cancel fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* Masalar */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
          {r.tables.map(({ table }) => (
            <Box
              key={table.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                bgcolor: 'action.hover',
                borderRadius: 1,
                px: 1,
                py: 0.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                #{table.number}
              </Typography>
              <CategoryBadge category={table.category} />
            </Box>
          ))}
        </Stack>

        {/* Tarih */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', mb: 1 }}
        >
          <Event fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatRange(r.start_time, r.end_time)}
          </Typography>
        </Stack>

        {/* Süre + Tahmini Tutar */}
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', mb: (r.notes || r.contact_phone) ? 1.5 : 0 }}
        >
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <AccessTime fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {hours.toFixed(1)} saat
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
            {estimatedTotal} ₺ (tahmini)
          </Typography>
          {r.participants.length > 1 && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Group fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {r.participants.length} kişi
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Notlar + Telefon */}
        {(r.notes || r.contact_phone) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={0.5}>
              {r.contact_phone && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  📞 {r.contact_phone}
                </Typography>
              )}
              {r.notes && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <StickyNote2 fontSize="small" sx={{ color: 'text.secondary', mt: 0.25 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    {r.notes}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}

        {/* Owner (admin) */}
        {showOwner && r.owner && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}
          >
            Sahibi: {r.owner.full_name || r.owner.email}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
