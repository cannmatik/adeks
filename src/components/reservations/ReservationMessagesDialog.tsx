'use client';

import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import ChatPanel from '@/components/messages/ChatPanel';

interface Props {
  open: boolean;
  reservationId: string | null;
  onClose: () => void;
}

export default function ReservationMessagesDialog({ open, reservationId, onClose }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '70vh',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>Rezervasyon Mesajları</DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {reservationId && <ChatPanel reservationId={reservationId} />}
      </DialogContent>
    </Dialog>
  );
}
