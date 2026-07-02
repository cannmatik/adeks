import { Stack, Box, Typography, Divider, Button, IconButton, TextField, CircularProgress, Snackbar, Alert } from '@mui/material';
import { DeleteOutlined, SaveOutlined } from '@mui/icons-material';
import { useEffect, useState } from 'react';

interface Props {
  reservation: any;
  isAdmin?: boolean;
  onUpdateStatus?: (id: string, status: any) => void;
  onDelete?: (id: string) => void;
  extraActions?: React.ReactNode;
}

export default function ReservationDetails({ reservation, isAdmin = false, onUpdateStatus, onDelete, extraActions }: Props) {
  const [adminNote, setAdminNote] = useState(reservation?.admin_notes || '');
  const [savedNote, setSavedNote] = useState(reservation?.admin_notes || '');
  const [savingNote, setSavingNote] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    setAdminNote(reservation?.admin_notes || '');
    setSavedNote(reservation?.admin_notes || '');
    setNoteError('');
  }, [reservation?.id, reservation?.admin_notes]);

  if (!reservation) return null;

  const handleSaveNote = async () => {
    setSavingNote(true);
    setNoteError('');
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNote })
      });
      if (res.ok) {
        reservation.admin_notes = adminNote;
        setSavedNote(adminNote);
        setShowSuccess(true);
      } else {
        const data = await res.json();
        setNoteError(data.error || 'Admin notu kaydedilemedi');
      }
    } catch (e) {
      console.error('Not kaydedilemedi', e);
      setNoteError('Admin notu kaydedilemedi');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Box>
        <Typography variant="caption" color="text.secondary">Kullanıcı</Typography>
        <Typography variant="body1">{reservation.owner?.full_name || 'Bilinmiyor'} {reservation.owner?.email ? `(${reservation.owner.email})` : ''}</Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="caption" color="text.secondary">Telefon</Typography>
        <Typography variant="body1">{reservation.contact_phone || 'Belirtilmemiş'}</Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="caption" color="text.secondary">Tarih</Typography>
        <Typography variant="body1">
          {new Date(reservation.start_time).toLocaleDateString('tr-TR')} {new Date(reservation.start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {new Date(reservation.end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="caption" color="text.secondary">Masalar</Typography>
        <Typography variant="body1">
          {reservation.tables?.length > 0 ? reservation.tables.map((rt: any) => `#${rt.table.number}`).join(', ') : 'Masa seçilmemiş'}
        </Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="caption" color="text.secondary">Müşteri Notu</Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{reservation.notes || 'Yok'}</Typography>
      </Box>
      <Divider />
      {isAdmin && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Admin Notu
            {adminNote !== savedNote && (
               <Button size="small" onClick={handleSaveNote} disabled={savingNote} startIcon={savingNote ? <CircularProgress size={12} /> : <SaveOutlined />}>Kaydet</Button>
            )}
          </Typography>
          <TextField
            multiline
            fullWidth
            size="small"
            minRows={2}
            placeholder="Sadece yöneticilerin görebileceği notlar (Örn: PUBG oynayacaklar, vs.)"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            sx={{ mt: 1, '& .MuiInputBase-root': { bgcolor: 'background.default' } }}
          />
          {noteError && (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setNoteError('')}>
              {noteError}
            </Alert>
          )}
        </Box>
      )}

      {(onUpdateStatus || onDelete || extraActions) && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            {onUpdateStatus && reservation.status === 'HOLD' && (
              <>
                <Button size="small" variant="contained" color="success" onClick={() => onUpdateStatus(reservation.id, 'CONFIRMED')}>Onayla</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => onUpdateStatus(reservation.id, 'CANCELLED')}>Reddet</Button>
              </>
            )}
            {onUpdateStatus && reservation.status === 'CONFIRMED' && (
              <Button size="small" variant="contained" color="primary" onClick={() => onUpdateStatus(reservation.id, 'COMPLETED')}>Tamamla</Button>
            )}
            {extraActions}
            {onDelete && (
              <IconButton size="small" color="error" onClick={() => onDelete(reservation.id)} sx={{ ml: 'auto' }} title="Sil">
                <DeleteOutlined />
              </IconButton>
            )}
          </Box>
        </>
      )}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Admin notu kaydedildi!
        </Alert>
      </Snackbar>
    </Stack>
  );
}
