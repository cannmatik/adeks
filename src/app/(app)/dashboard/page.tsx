'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, Typography, Alert, CircularProgress, Paper, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Collapse, IconButton } from '@mui/material';
import { EventAvailable, Clear, DateRange, Search, TouchApp, ExpandLess, ExpandMore } from '@mui/icons-material';
import { CafeTable } from '@/components/tables/TableCard';
import RoomLayout from '@/components/tables/RoomLayout';
import { TableCategory } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/tr';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

dayjs.locale('tr');

function defaultStart() {
  return dayjs().add(1, 'hour').second(0).millisecond(0);
}
function defaultEnd() {
  return dayjs().add(1, 'hour').add(1, 'hour').second(0).millisecond(0);
}

export default function DashboardPage() {
  const { categories: dbCategories, categoryMeta } = useCategories();
  const categoriesList = useMemo(() => ['ALL', ...dbCategories.map((c) => c.name)], [dbCategories]);

  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TableCategory | 'ALL'>('ALL');
  const [floor, setFloor] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [start, setStart] = useState<Dayjs>(defaultStart());
  const [end, setEnd] = useState<Dayjs>(defaultEnd());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [basketExpanded, setBasketExpanded] = useState(true);

  const startRef = useRef(start);
  const endRef = useRef(end);
  startRef.current = start;
  endRef.current = end;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    // Remove unconditional clear to preserve user selection on auto-refresh
    try {
      const url = new URL('/api/tables/status', window.location.origin);
      url.searchParams.set('start', startRef.current.toISOString());
      url.searchParams.set('end', endRef.current.toISOString());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setTables(data.tables);

      // Clean up selectedIds: keep them only if they are still available
      setSelectedIds(prev => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const id of next) {
          const t = data.tables.find((table: CafeTable) => table.id === id);
          if (!t || t.booking_status !== 'AVAILABLE' || t.status === 'MAINTENANCE') {
            next.delete(id);
          }
        }
        return next;
      });
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
    () => selectedTables.reduce((sum, t) => sum + (categoryMeta[t.category]?.defaultRate ?? 0), 0),
    [selectedTables, categoryMeta],
  );

  const estimatedTotal = useMemo(() => {
    if (!start || !end || !start.isValid() || !end.isValid()) return 0;
    const diffMs = end.diff(start);
    const durationHours = Math.max(0, diffMs / (1000 * 60 * 60));
    return totalRate * durationHours;
  }, [start, end, totalRate]);

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
          start_time: start.toISOString(),
          end_time: end.toISOString(),
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
      if (t.status === 'MAINTENANCE') return false;
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.5rem', md: '2.125rem' }, fontWeight: 800 }}>Salon Düzeni</Typography>
        
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper elevation={0} sx={{ p: 2, flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-start', gap: 1.5, bgcolor: 'background.default' }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 1, borderRadius: 2, display: 'flex' }}>
              <DateRange fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>1. Tarih ve Saat</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Rezervasyon yapmak istediğiniz tarih ve saat aralığını seçin.</Typography>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-start', gap: 1.5, bgcolor: 'background.default' }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 1, borderRadius: 2, display: 'flex' }}>
              <Search fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>2. Müsaitlik Durumu</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>Müsaitlik Durumu butonuna tıklayarak o saatlerdeki boş masaları kontrol edin.</Typography>
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-start', gap: 1.5, bgcolor: 'background.default' }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 1, borderRadius: 2, display: 'flex' }}>
              <TouchApp fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>3. Seçim ve Onay</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>İstediğiniz masaları seçin ve rezervasyon yap butonuna basın.</Typography>
            </Box>
          </Paper>
        </Stack>
      </Box>

      {/* Tarih seçimi */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            <DateTimePicker
              label="Başlangıç"
              value={start}
              minDateTime={dayjs().add(1, 'hour').second(0).millisecond(0)}
              onChange={(newValue) => {
                setStart(newValue as Dayjs);
                if (newValue && newValue.isValid()) {
                  let duration = 60 * 60 * 1000; // 1 hour min
                  if (start && start.isValid() && end && end.isValid()) {
                    duration = end.diff(start);
                  }
                  if (isNaN(duration) || duration < 60 * 60 * 1000) {
                    duration = 60 * 60 * 1000;
                  }
                  setEnd(newValue.add(duration, 'millisecond'));
                }
              }}
              sx={{ width: '100%' }}
            />
            <DateTimePicker
              label="Bitiş"
              value={end}
              minDateTime={start && start.isValid() ? start.add(1, 'hour') : undefined}
              onChange={(newValue) => {
                setEnd(newValue as Dayjs);
              }}
              sx={{ width: '100%' }}
            />
            <Button variant="contained" size="large" startIcon={<EventAvailable />} onClick={load} disabled={loading} sx={{ flexShrink: 0 }}>
              Müsaitlik Durumu
            </Button>
          </Stack>
        </LocalizationProvider>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {(
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
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
            {categoriesList.map((c) => (
              <Chip
                key={c}
                label={c === 'ALL' ? 'Tümü' : (categoryMeta[c]?.label ?? c)}
                onClick={() => setFilter(c)}
                color={filter === c ? 'primary' : 'default'}
                variant={filter === c ? 'filled' : 'outlined'}
                size="small"
                sx={c !== 'ALL' && filter !== c ? { borderColor: (categoryMeta[c]?.color ?? '#C0C0C0') + '80', color: categoryMeta[c]?.color ?? '#C0C0C0' } : undefined}
              />
            ))}
          </Stack>

          {selectedTables.length > 0 && (
            <Paper
              elevation={4}
              sx={{
                position: { xs: 'fixed', md: 'static' },
                bottom: { xs: 16, md: 'auto' },
                left: { xs: 16, md: 'auto' },
                right: { xs: 16, md: 'auto' },
                zIndex: { xs: 1300, md: 1 },
                mb: { xs: 0, md: 2 },
                p: 1.5,
                borderRadius: 2,
                border: '1.5px solid',
                borderColor: 'primary.main',
                bgcolor: 'background.paper',
                boxShadow: { xs: '0 8px 32px rgba(0,0,0,0.2)', md: 'none' },
              }}
            >
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', cursor: { xs: 'pointer', md: 'default' } }} onClick={() => setBasketExpanded(!basketExpanded)}>
                <Typography variant="body2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {selectedTables.length} Masa Seçili
                  <Typography component="span" variant="caption" color="text.secondary">
                    ({totalRate.toFixed(0)} ₺/saat)
                  </Typography>
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); handleReserveClick(); }} disabled={submitting}>
                    Devam Et
                  </Button>
                  <IconButton size="small" sx={{ display: { md: 'none' } }}>
                    {basketExpanded ? <ExpandMore /> : <ExpandLess />}
                  </IconButton>
                </Stack>
              </Stack>

              {/* Açılır Kapanır Detay Kısmı */}
              <Collapse in={basketExpanded} sx={{ width: '100%' }}>
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
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
                  <Button size="small" variant="outlined" startIcon={<Clear />} onClick={clearSelection}>
                    Temizle
                  </Button>
                </Box>
              </Collapse>
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
              Rezervasyon talebiniz yönetici onayına gönderilecektir. Onaylandıktan sonra kesinleşecektir.
            </Alert>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>Tarih Aralığı</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {start.toDate().toLocaleString('tr-TR')} — {end.toDate().toLocaleString('tr-TR')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>Seçili Masalar ({selectedTables.length})</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {selectedTables.map((t) => (
                  <Chip key={t.id} label={`#${t.number} · ${categoryMeta[t.category]?.label ?? t.category}`} size="small" />
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>Tahmini Ücret</Typography>
              <Stack direction="row" sx={{ alignItems: 'baseline' }} spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {estimatedTotal.toFixed(0)} ₺
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  ({totalRate.toFixed(0)} ₺ / saat)
                </Typography>
              </Stack>
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
