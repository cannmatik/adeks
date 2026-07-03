'use client';

import { Dialog, DialogContent, DialogTitle, IconButton, useMediaQuery, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatPanel from '@/components/messages/ChatPanel';

interface Props {
  open: boolean;
  reservationId: string | null;
  onClose: () => void;
}

export default function ReservationMessagesDialog({ open, reservationId, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      slotProps={{
        paper: {
          sx: {
            height: { xs: '100%', sm: '70vh' },
            borderRadius: { xs: 0, sm: 2 },
            border: { xs: 0, sm: '1px solid' },
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Rezervasyon Mesajları
        {fullScreen && (
          <IconButton onClick={onClose} size="small" edge="end">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {reservationId && <ChatPanel reservationId={reservationId} />}
      </DialogContent>
    </Dialog>
  );
}
