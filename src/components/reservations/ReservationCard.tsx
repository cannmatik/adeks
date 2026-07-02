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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  Cancel,
  Chat,
  Edit,
  Event,
  Group,
  Phone,
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

const STATUS_ACCENT: Record<ReservationStatus, string> = {
  REQUESTED: '#8A8A91',
  CONFIRMED: '#10B981',
  CANCELLED: '#F87171',
  COMPLETED: '#6B7280',
  HOLD: '#F59E0B',
};

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
  const accentColor = STATUS_ACCENT[r.status];
  const isPast = r.status === 'CANCELLED' || r.status === 'COMPLETED';

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        opacity: isPast ? 0.7 : 1,
        borderLeft: 'none',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: isPast ? 'none' : 'translateY(-2px)',
          boxShadow: isPast ? undefined : '0 10px 28px rgba(0,0,0,0.14)',
          borderColor: accentColor,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          bgcolor: accentColor,
          borderRadius: '4px 0 0 4px',
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        {/* Header: Status chip + action icons */}
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Chip
            size="small"
            label={statusLabel}
            color={statusColor}
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: '0.68rem',
              height: 26,
            }}
          />
          <Stack direction="row" spacing={0.25}>
            {actions}
            {onEdit && editable && (
              <Tooltip title="Düzenle" arrow>
                <IconButton
                  size="small"
                  onClick={() => onEdit(r)}
                  sx={{
                    color: 'text.secondary',
                    transition: 'all 0.2s',
                    '&:hover': { color: 'primary.main', bgcolor: 'rgba(225,29,42,0.1)' },
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onOpenMessages && (
              <Tooltip title="Mesajlar" arrow>
                <IconButton
                  size="small"
                  onClick={() => onOpenMessages(r.id)}
                  sx={{
                    color: 'text.secondary',
                    transition: 'all 0.2s',
                    '&:hover': { color: 'primary.main', bgcolor: 'rgba(225,29,42,0.1)' },
                  }}
                >
                  <Chat fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onCancel && cancelable && (
              <Tooltip title="İptal Et" arrow>
                <IconButton
                  size="small"
                  onClick={() => onCancel(r.id)}
                  sx={{
                    color: 'text.secondary',
                    transition: 'all 0.2s',
                    '&:hover': { color: 'error.main', bgcolor: 'rgba(248,113,113,0.1)' },
                  }}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        {/* Masa Badges */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, max-content))' },
            gap: 0.75,
            mb: 2,
          }}
        >
          {r.tables.map(({ table }) => (
            <Box
              key={table.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr',
                alignItems: 'center',
                gap: 0.75,
                width: 'fit-content',
                minWidth: 218,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.04)',
                borderRadius: 1.5,
                px: 1.25,
                py: 0.5,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, fontSize: '0.8rem', textAlign: 'center' }}
              >
                #{table.number}
              </Typography>
              <CategoryBadge category={table.category} />
            </Box>
          ))}
        </Box>

        {/* Date & Time - Info Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr auto auto' },
            gap: 1.5,
            alignItems: 'center',
            mb: (r.notes || r.contact_phone) ? 2 : 0,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.03)'
                : 'rgba(0,0,0,0.02)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Tarih */}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Event fontSize="small" sx={{ color: accentColor, fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
              {formatRange(r.start_time, r.end_time)}
            </Typography>
          </Stack>

          {/* Süre */}
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <AccessTime sx={{ color: 'text.secondary', fontSize: 16 }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
              {hours.toFixed(1)} saat
            </Typography>
          </Stack>

          {/* Fiyat + Katılımcılar */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography
              variant="body2"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {estimatedTotal} ₺
            </Typography>
            {r.participants.length > 1 && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Group sx={{ color: 'text.secondary', fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  {r.participants.length} kişi
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>

        {/* Notlar + Telefon */}
        {(r.notes || r.contact_phone) && (
          <>
            <Divider sx={{ my: 1.5, borderColor: 'divider' }} />
            <Stack spacing={0.75}>
              {r.contact_phone && (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Phone sx={{ color: 'text.secondary', fontSize: 15 }} />
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.02em' }}
                  >
                    {r.contact_phone}
                  </Typography>
                </Stack>
              )}
              {r.notes && (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                  <StickyNote2 sx={{ color: 'text.secondary', mt: 0.25, fontSize: 15 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      fontStyle: 'italic',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {r.notes}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </>
        )}

        {/* Owner (admin view) */}
        {showOwner && r.owner && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              mt: 1.5,
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            Sahibi: {r.owner.full_name || r.owner.email}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
