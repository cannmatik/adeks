'use client';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RoomLayout from '@/components/tables/RoomLayout';
import { CafeTable } from '@/components/tables/TableCard';

interface Props {
  open: boolean;
  saving: boolean;
  error?: string;
  start: string;
  end: string;
  notes: string;
  phone: string;
  tables: CafeTable[];
  tablesLoading: boolean;
  selectedTableIds: Set<string>;
  onToggleTable: (table: CafeTable) => void;
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
  error,
  start,
  end,
  notes,
  phone,
  tables,
  tablesLoading,
  selectedTableIds,
  onToggleTable,
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
      maxWidth="md"
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
          {error && <Alert severity="error">{error}</Alert>}
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

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Masalar {selectedTableIds.size > 0 && `(${selectedTableIds.size} seçili)`}
            </Typography>
            {selectedTableIds.size > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                {tables
                  .filter((t) => selectedTableIds.has(t.id))
                  .map((t) => (
                    <Chip
                      key={t.id}
                      label={`#${t.number}`}
                      size="small"
                      onDelete={() => onToggleTable(t)}
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
              </Stack>
            )}
            {tablesLoading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box
                sx={{
                  maxHeight: 420,
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1,
                }}
              >
                <RoomLayout tables={tables} selectedIds={selectedTableIds} onClickTable={onToggleTable} floor="ALL" />
              </Box>
            )}
          </Box>
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
