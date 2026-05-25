'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, Typography, Alert, CircularProgress, Paper, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { EventAvailable, Clear } from '@mui/icons-material';
import { CafeTable } from '@/components/tables/TableCard';
import RoomLayout from '@/components/tables/RoomLayout';
import { CATEGORY_META, TableCategory } from '@/lib/categories';

const categories: (TableCategory | 'ALL')[] = ['ALL', 'SILVER', 'GOLD', 'PLATINUM', 'PLATINUM_PLUS', 'ELITE', 'STREAM_RENDER'];

function defaultStart() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}
function defaultEnd() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function DashboardPage() {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TableCategory | 'ALL'>('ALL');
  const [floor, setFloor] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(defaultEnd());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');

  const startRef = useRef(start);
  const endRef = useRef(end);
  startRef.current = start;
  endRef.current = end;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setSelectedIds(new Set());
    try {
      const url = new URL('/api/tables/status', window.location.origin);
      url.searchParams.set('start', new Date(startRef.current).toISOString());
      url.searchParams.set('end', new Date(endRef.current).toISOString());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setTables(data.tables);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleTable = (t: CafeTable) => {
    if (t.booking_status !== 'AVAILABLE' || t.status === 'MAINTENANCE') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      return next;
    });
  };

  const selectedTables = useMemo(() => tables.filter((t) => selectedIds.has(t.id)), [tables, selectedIds]);

  const clearSelection = () => setSelectedIds(new Set());

  const totalRate = useMemo(
    () => selectedTables.reduce((sum, t) => sum + CATEGORY_META[t.category].defaultRate, 0),
    [selectedTables],
  );

  const handleReserveClick = () => {
    if (selectedTables.length === 0) return;
    setConfirmNotes('');
    setConfirmPhone('');
    setConfirmOpen(true);
  };

  const handleConfirmReserve = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_ids: selectedTables.map((t) => t.id),
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          notes: confirmNotes || null,
          contact_phone: confirmPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rezervasyon oluşturulamadı');
      setSuccess('Rezervasyon talebiniz alındı! Onay için bekleniyor.');
      setSelectedIds(new Set());
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return tables.filter((t) => {
      if (floor !== 'ALL' && t.room?.floor !== floor) return false;
      if (filter !== 'ALL' && t.category !== filter) return false;
      return true;
    });
  }, [tables, filter, floor]);

  // Sayfa açıldığında otomatik yükle + canlı yenileme
  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Salon Düzeni</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Tarih aralığı seç ve müsait masaları gör — çoklu seçim yaparak rezervasyon oluştur.
          </Typography>
        </Box>
      </Stack>

      {/* Tarih seçimi */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            label="Başlangıç"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="Bitiş"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <Button variant="contained" size="large" startIcon={<EventAvailable />} onClick={load} disabled={loading} sx={{ flexShrink: 0 }}>
            Masaları Getir
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {(
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Chip
              key="ALL"
              label="Tümü"
              onClick={() => setFloor('ALL')}
              color={floor === 'ALL' ? 'primary' : 'default'}
              variant={floor === 'ALL' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 700, px: 0.5 }}
            />
            {Array.from(new Set(tables.map((t) => t.room?.floor).filter(Boolean))).sort().map((f) => (
              <Chip
                key={f}
                label={`${f}. Kat`}
                onClick={() => setFloor(f as string)}
                color={floor === f ? 'primary' : 'default'}
                variant={floor === f ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, px: 0.5 }}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {categories.map((c) => (
              <Chip
                key={c}
                label={c === 'ALL' ? 'Tümü' : CATEGORY_META[c].label}
                onClick={() => setFilter(c)}
                color={filter === c ? 'primary' : 'default'}
                variant={filter === c ? 'filled' : 'outlined'}
                size="small"
                sx={c !== 'ALL' && filter !== c ? { borderColor: CATEGORY_META[c].color + '80', color: CATEGORY_META[c].color } : undefined}
              />
            ))}
          </Stack>

          {selectedTables.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                border: '1.5px solid',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                flexWrap: 'wrap',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Seçili:
                </Typography>
                {selectedTables.map((t) => (
                  <Chip
                    key={t.id}
                    label={`#${t.number}`}
                    size="small"
                    onDelete={() => toggleTable(t)}
                    sx={{ fontWeight: 700 }}
                  />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" startIcon={<Clear />} onClick={clearSelection}>
                  Temizle
                </Button>
                <Button size="small" variant="contained" onClick={handleReserveClick} disabled={submitting}>
                  Rezervasyon Yap
                </Button>
              </Stack>
            </Paper>
          )}
        </>
      )}

      {loading && tables.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">Bu kriterlere uygun masa yok.</Alert>
      ) : (
        <RoomLayout tables={filtered} floor={floor} onClickTable={toggleTable} selectedIds={selectedIds} />
      )}

      {/* Onay Dialogu */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rezervasyon Onayı</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="info">
              Rezervasyonunuz <b>HOLD</b> (bekleme) durumunda oluşturulacak. Admin onayından sonra aktif hale gelecektir.
            </Alert>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>Tarih Aralığı</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {new Date(start).toLocaleString('tr-TR')} — {new Date(end).toLocaleString('tr-TR')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>Seçili Masalar ({selectedTables.length})</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {selectedTables.map((t) => (
                  <Chip key={t.id} label={`#${t.number} · ${CATEGORY_META[t.category].label}`} size="small" />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>Toplam Ücret</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {totalRate.toFixed(0)} ₺/saat
              </Typography>
            </Box>

            <TextField
              label="İletişim Telefonu *"
              type="tel"
              value={confirmPhone}
              onChange={(e) => setConfirmPhone(e.target.value)}
              fullWidth
              placeholder="05XX XXX XX XX"
              error={confirmPhone.length > 0 && confirmPhone.trim().length < 10}
              helperText={confirmPhone.length > 0 && confirmPhone.trim().length < 10 ? 'Geçerli telefon numarası girin' : ''}
            />
            <TextField
              label="Not (opsiyonel)"
              multiline
              minRows={2}
              value={confirmNotes}
              onChange={(e) => setConfirmNotes(e.target.value)}
              fullWidth
              placeholder="Rezervasyonunuzla ilgili eklemek istediğiniz not..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleConfirmReserve} disabled={submitting || !confirmPhone.trim() || confirmPhone.trim().length < 10}>
            {submitting ? 'Gönderiliyor...' : 'Onayla ve Gönder'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
