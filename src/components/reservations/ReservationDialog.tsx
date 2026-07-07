'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Add, Remove, Event, Group, Category, EventSeat, Close } from '@mui/icons-material';
import { CafeTable } from '@/components/tables/TableCard';
import RoomLayout from '@/components/tables/RoomLayout';
import { TableCategory } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';

interface Props {
  open: boolean;
  initialTable: CafeTable | null;
  initialTableIds?: string[];
  onClose: () => void;
  onSubmitted?: () => void;
}

const steps = ['Tarih & Saat', 'Kişi Sayısı', 'Kategori', 'Masa Seçimi'];

function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}
function defaultEnd() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 3);
  return d.toISOString().slice(0, 16);
}



export default function ReservationDialog({ open, initialTable, initialTableIds, onClose, onSubmitted }: Props) {
  const { categories: dbCategories, categoryMeta } = useCategories();
  const [step, setStep] = useState(0);

  // Step 1
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(defaultEnd());

  // Step 2
  const [people, setPeople] = useState(1);

  // Step 3
  const [category, setCategory] = useState<TableCategory | 'ALL'>('ALL');

  // Step 4
  const [available, setAvailable] = useState<CafeTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<CafeTable[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const preselectedIdsRef = useRef<Set<string>>(new Set());

  // Common
  const [notes, setNotes] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  // Open / reset
  useEffect(() => {
    if (open) {
      setStep(0);
      setStart(defaultStart());
      setEnd(defaultEnd());
      setPeople(1);
      setCategory(initialTable?.category ?? 'ALL');
      setAvailable([]);
      setSelectedTables(initialTable ? [initialTable] : []);
      setNotes('');
      setEmails([]);
      setEmailInput('');
      setError('');
      setSuccess(null);
    }
  }, [open, initialTable]);

  // Preselected ids değiştiğinde set et
  useEffect(() => {
    if (!open) return;
    preselectedIdsRef.current.clear();
    if (initialTableIds) {
      for (const id of initialTableIds) preselectedIdsRef.current.add(id);
    }
    if (initialTable) preselectedIdsRef.current.add(initialTable.id);
  }, [open, initialTableIds, initialTable]);

  // Step 4 girince müsait masaları çek
  useEffect(() => {
    if (!open || step !== 3) return;
    const ctrl = new AbortController();
    setLoadingAvail(true);
    setError('');
    const url = new URL('/api/tables/availability', window.location.origin);
    url.searchParams.set('start', new Date(start).toISOString());
    url.searchParams.set('end', new Date(end).toISOString());
    if (category !== 'ALL') url.searchParams.set('category', category);
    fetch(url.toString(), { signal: ctrl.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Yüklenemedi');
        setAvailable(data.tables);
        // Eski seçimleri + preselected id'leri yeni müsait listeye göre filtrele
        setSelectedTables((prev) => {
          const kept = prev.filter((p) => data.tables.some((t: CafeTable) => t.id === p.id));
          const keptIds = new Set(kept.map((k) => k.id));
          const toAdd = data.tables.filter((t: CafeTable) => preselectedIdsRef.current.has(t.id) && !keptIds.has(t.id));
          return [...kept, ...toAdd];
        });
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => setLoadingAvail(false));
    return () => ctrl.abort();
  }, [open, step, start, end, category]);

  const totalRate = useMemo(
    () => selectedTables.reduce((sum, t) => sum + (categoryMeta[t.category]?.defaultRate ?? 0), 0),
    [selectedTables, categoryMeta],
  );

  const canNext = () => {
    if (step === 0) return new Date(end) > new Date(start);
    if (step === 1) return people > 0;
    return true;
  };

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e) return;
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setError('Geçersiz e-posta');
      return;
    }
    if (!emails.includes(e)) setEmails([...emails, e]);
    setEmailInput('');
    setError('');
  };

  const toggleTable = (t: CafeTable) => {
    setSelectedTables((prev) =>
      prev.some((x) => x.id === t.id) ? prev.filter((x) => x.id !== t.id) : [...prev, t],
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedTables.length === 0) {
      setError('En az bir masa seçmelisin');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_ids: selectedTables.map((t) => t.id),
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          notes: notes || null,
          participant_emails: emails,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Rezervasyon oluşturulamadı');
        return;
      }
      const nf = (data.notFoundParticipants ?? []) as string[];
      setSuccess(
        nf.length > 0
          ? `Rezervasyon alındı! Bulunamayan e-postalar: ${nf.join(', ')}`
          : 'Rezervasyon talebiniz alındı!',
      );
      setTimeout(() => {
        setSuccess(null);
        onSubmitted?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Yeni Rezervasyon</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((label, i) => (
            <Step key={label}>
              <StepLabel
                icon={
                  i === 0 ? <Event fontSize="small" /> :
                  i === 1 ? <Group fontSize="small" /> :
                  i === 2 ? <Category fontSize="small" /> :
                  <EventSeat fontSize="small" />
                }
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
        )}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* STEP 0: Tarih */}
        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Rezervasyon için başlangıç ve bitiş zamanını seç.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
            </Stack>
          </Stack>
        )}

        {/* STEP 1: Kişi sayısı */}
        {step === 1 && (
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Kaç kişi olacaksınız?
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <IconButton onClick={() => setPeople(Math.max(1, people - 1))} disabled={people <= 1}>
                <Remove />
              </IconButton>
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: 3,
                  border: 2,
                  borderColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h2" sx={{ color: 'primary.main' }}>{people}</Typography>
              </Box>
              <IconButton onClick={() => setPeople(people + 1)}>
                <Add />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1}>
              {[1, 2, 3, 4, 6, 8].map((n) => (
                <Chip
                  key={n}
                  label={n}
                  onClick={() => setPeople(n)}
                  variant={people === n ? 'filled' : 'outlined'}
                  color={people === n ? 'primary' : 'default'}
                />
              ))}
            </Stack>
            <TextField
              size="small"
              label="Grup üye e-postaları (opsiyonel)"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              placeholder="ornek@adeks.com"
              fullWidth
              sx={{ mt: 2 }}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: (
                    <Button size="small" onClick={addEmail} disabled={!emailInput.trim()}>Ekle</Button>
                  ),
                },
              }}
            />
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {emails.map((e) => (
                <Chip key={e} label={e} onDelete={() => setEmails(emails.filter((x) => x !== e))} />
              ))}
            </Stack>
          </Stack>
        )}

        {/* STEP 2: Kategori */}
        {step === 2 && (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Hangi kategoriden masa istersin? Hepsini seçersen tüm kategoriler listelenecek.
            </Typography>
            <ToggleButtonGroup
              value={category}
              exclusive
              onChange={(_, v) => v && setCategory(v)}
              sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { borderRadius: '8px !important', border: '1px solid var(--mui-palette-divider) !important' } }}
            >
              <ToggleButton value="ALL">Tümü</ToggleButton>
              {dbCategories.map((c) => (
                <ToggleButton key={c.name} value={c.name}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: categoryMeta[c.name]?.color ?? '#C0C0C0' }} />
                    <span>{categoryMeta[c.name]?.label ?? c.label}</span>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {categoryMeta[c.name]?.defaultRate ?? Number(c.hourly_rate)}₺
                    </Typography>
                  </Stack>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {category !== 'ALL' && (
              <Alert severity="info" icon={false} sx={{ bgcolor: (categoryMeta[category]?.color ?? '#C0C0C0') + '15' }}>
                <Typography variant="body2">
                  <b>{categoryMeta[category]?.label ?? category}:</b> {categoryMeta[category]?.description ?? ''}
                </Typography>
              </Alert>
            )}
          </Stack>
        )}

        {/* STEP 3: Masa seçimi */}
        {step === 3 && (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Müsait masalardan {people} kişilik için en az {people} masa seç.
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Seçili: <b>{selectedTables.length}</b> · Toplam: <b>{totalRate.toFixed(0)} ₺/saat</b>
              </Typography>
            </Box>

            {selectedTables.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  Seçilenler
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {selectedTables.map((t) => (
                    <Chip
                      key={t.id}
                      label={`#${t.number} · ${t.category}`}
                      onDelete={() => toggleTable(t)}
                      deleteIcon={<Close />}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {loadingAvail ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : available.length === 0 ? (
              <Alert severity="warning">
                Seçtiğin tarih/kategori için müsait masa yok. Bir önceki adıma dön ve seçimleri değiştir.
              </Alert>
            ) : (
              <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
                <RoomLayout
                  tables={available}
                  selectedIds={new Set(selectedTables.map((t) => t.id))}
                  onClickTable={toggleTable}
                />
              </Box>
            )}

            <TextField
              label="Not (opsiyonel)"
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={submitting}>İptal</Button>
        <Stack direction="row" spacing={1}>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)} disabled={submitting}>Geri</Button>
          )}
          {step < 3 ? (
            <Button variant="contained" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              İleri
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || selectedTables.length === 0 || !!success}
            >
              {submitting ? 'Gönderiliyor...' : 'Talep Gönder'}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
