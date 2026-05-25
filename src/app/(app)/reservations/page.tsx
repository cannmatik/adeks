'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ReservationCard, { ReservationRow } from '@/components/reservations/ReservationCard';

export default function ReservationsPage() {
  const [items, setItems] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReservationRow | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations?scope=mine');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setItems(data.reservations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Bu rezervasyonu iptal etmek istiyor musunuz?')) return;
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    if (res.ok) {
      setSuccess('Rezervasyon iptal edildi.');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError((await res.json()).error);
    }
  };

  const openEdit = (r: ReservationRow) => {
    setEditItem(r);
    setEditStart(new Date(r.start_time).toISOString().slice(0, 16));
    setEditEnd(new Date(r.end_time).toISOString().slice(0, 16));
    setEditNotes(r.notes ?? '');
    setEditPhone(r.contact_phone ?? '');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reservations/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: new Date(editStart).toISOString(),
          end_time: new Date(editEnd).toISOString(),
          notes: editNotes || null,
          contact_phone: editPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi');
      setEditOpen(false);
      setSuccess('Rezervasyon güncellendi.');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Rezervasyonlarım
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Tüm rezervasyon taleplerin ve durumları.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">
          Henüz rezervasyonun yok. Masalar sayfasından bir tane oluştur.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {items.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onCancel={handleCancel}
              onEdit={openEdit}
            />
          ))}
        </Stack>
      )}

      {/* Düzenleme Dialogu */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rezervasyonu Düzenle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Başlangıç"
                type="datetime-local"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Bitiş"
                type="datetime-local"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
            <TextField
              label="İletişim Telefonu"
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              fullWidth
              placeholder="05XX XXX XX XX"
            />
            <TextField
              label="Not"
              multiline
              minRows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              fullWidth
              placeholder="Rezervasyon notunuz..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>
            İptal
          </Button>
          <Button variant="contained" onClick={handleEditSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
