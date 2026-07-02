'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

interface Props {
  open: boolean;
  saving: boolean;
  start: string;
  end: string;
  notes: string;
  phone: string;
  onClose: () => void;
  onSave: () => void;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onChangePhone: (value: string) => void;
}

export default function ReservationEditDialog({
  open,
  saving,
  start,
  end,
  notes,
  phone,
  onClose,
  onSave,
  onChangeStart,
  onChangeEnd,
  onChangeNotes,
  onChangePhone,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Rezervasyonu Düzenle</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Başlangıç"
              type="datetime-local"
              value={start}
              onChange={(e) => onChangeStart(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Bitiş"
              type="datetime-local"
              value={end}
              onChange={(e) => onChangeEnd(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
          <TextField
            label="İletişim Telefonu"
            type="tel"
            value={phone}
            onChange={(e) => onChangePhone(e.target.value)}
            fullWidth
            placeholder="05XX XXX XX XX"
          />
          <TextField
            label="Not"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            fullWidth
            placeholder="Rezervasyon notunuz..."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          İptal
        </Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
