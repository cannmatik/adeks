'use client';

import { Box, Stack, Typography } from '@mui/material';
import ReservationCard, { ReservationRow } from '@/components/reservations/ReservationCard';

interface Props {
  activeItems: ReservationRow[];
  pastItems: ReservationRow[];
  onCancel: (id: string) => void;
  onEdit: (reservation: ReservationRow) => void;
  onOpenMessages: (id: string) => void;
}

function ReservationSection({
  title,
  items,
  muted = false,
  onCancel,
  onEdit,
  onOpenMessages,
}: {
  title: string;
  items: ReservationRow[];
  muted?: boolean;
  onCancel: (id: string) => void;
  onEdit: (reservation: ReservationRow) => void;
  onOpenMessages: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <Box sx={{ mb: muted ? 0 : 4 }}>
      <Typography
        variant="overline"
        sx={{
          color: muted ? 'text.disabled' : 'text.secondary',
          display: 'block',
          mb: 1.5,
          fontSize: '0.7rem',
        }}
      >
        {title} ({items.length})
      </Typography>
      <Stack spacing={muted ? 1.5 : 2}>
        {items.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onCancel={onCancel}
            onEdit={onEdit}
            onOpenMessages={onOpenMessages}
          />
        ))}
      </Stack>
    </Box>
  );
}

export default function ReservationsList({
  activeItems,
  pastItems,
  onCancel,
  onEdit,
  onOpenMessages,
}: Props) {
  return (
    <Box>
      <ReservationSection
        title="Aktif Rezervasyonlar"
        items={activeItems}
        onCancel={onCancel}
        onEdit={onEdit}
        onOpenMessages={onOpenMessages}
      />
      <ReservationSection
        title="Geçmiş"
        items={pastItems}
        muted
        onCancel={onCancel}
        onEdit={onEdit}
        onOpenMessages={onOpenMessages}
      />
    </Box>
  );
}
