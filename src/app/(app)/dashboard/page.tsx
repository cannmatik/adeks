'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, Typography, Alert, CircularProgress, Paper, TextField, Collapse, IconButton, Stepper, Step, StepLabel, StepContent, FormControl, InputLabel, Select, MenuItem, Portal } from '@mui/material';
import { EventAvailable, Clear, DateRange, Search, TouchApp, ExpandLess, ExpandMore, CheckCircle, RocketLaunch, Send } from '@mui/icons-material';
import { CafeTable } from '@/components/tables/TableCard';
import RoomLayout from '@/components/tables/RoomLayout';
import { TableCategory } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';
import gsap from 'gsap';

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/tr';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

dayjs.locale('tr');

function defaultStart() {
  return dayjs().add(55, 'minute').second(0).millisecond(0);
}
function defaultEnd() {
  return dayjs().add(55, 'minute').add(1, 'hour').second(0).millisecond(0);
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
  
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [basketExpanded, setBasketExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const [successMode, setSuccessMode] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // GSAP: Page load animation
  useEffect(() => {
    if (!mounted) return;
    const ctx = gsap.context(() => {
      // Header fade-in + slide
      if (headerRef.current) {
        gsap.fromTo(headerRef.current, 
          { opacity: 0, y: -30 }, 
          { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
        );
      }
      // Stepper fade-in stagger
      if (stepperRef.current) {
        gsap.fromTo(stepperRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, delay: 0.25, ease: 'power2.out' }
        );
      }
    });
    return () => ctx.revert();
  }, [mounted]);

  // GSAP: Step transition animation
  useEffect(() => {
    if (!stepperRef.current) return;
    const activeContent = stepperRef.current.querySelector('.MuiStepContent-root .MuiCollapse-entered, .MuiStepContent-root .MuiCollapse-wrapper');
    if (activeContent) {
      gsap.fromTo(activeContent, 
        { opacity: 0, x: -15 }, 
        { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, [activeStep]);

  const startRef = useRef(start);
  const endRef = useRef(end);
  startRef.current = start;
  endRef.current = end;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = new URL('/api/tables/status', window.location.origin);
      url.searchParams.set('start', startRef.current.toISOString());
      url.searchParams.set('end', endRef.current.toISOString());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setTables(data.tables);

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

  const handleNextStep0 = async () => {
    setSelectedIds(new Set());
    await load();
    setActiveStep(1);
  };

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
    setActiveStep(2);
  };

  const handleConfirmReserve = async () => {
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
      
      setSuccessMode(true);
      setActiveStep(3);
      setTimeout(() => {
        setSuccessMode(false);
        setActiveStep(0);
        setSelectedIds(new Set());
        setSubmitting(false);
        setConfirmNotes('');
        setConfirmPhone('');
        load();
      }, 2500);

    } catch (err: any) {
      setError(err.message);
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

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <Box>
      <Box ref={headerRef} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ 
          mb: 0.5, 
          fontSize: { xs: '1.5rem', md: '2.125rem' }, 
          fontWeight: 800,
          color: 'text.primary',
        }}>Salon Düzeni</Typography>
        <Typography variant="body2" color="text.secondary">Rezervasyon adımlarını takip ederek işlemlerinizi hızlıca tamamlayın.</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {successMode ? (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 5, 
            borderRadius: 3, 
            textAlign: 'center', 
            border: '1px solid', 
            borderColor: 'success.main',
            background: (theme) => theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, rgba(225,29,42,0.08) 0%, rgba(139,15,24,0.04) 100%)'
              : 'linear-gradient(135deg, rgba(225,29,42,0.06) 0%, rgba(139,15,24,0.02) 100%)',
            animation: 'successPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <Box sx={{ 
            width: 100, height: 100, mx: 'auto', mb: 3,
            borderRadius: '50%', 
            bgcolor: 'success.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
            animation: 'successPulse 2s ease-in-out infinite',
          }}>
            <CheckCircle sx={{ fontSize: 60, color: '#fff' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            Rezervasyon Talebiniz Alındı!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Talebiniz başarıyla yönetici onayına gönderildi.
          </Typography>
          <style>{`
            @keyframes successPop {
              0% { transform: scale(0.5); opacity: 0; }
              60% { transform: scale(1.03); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes successPulse {
              0%, 100% { box-shadow: 0 8px 32px rgba(16,185,129,0.35); }
              50% { box-shadow: 0 8px 48px rgba(16,185,129,0.55); }
            }
          `}</style>
        </Paper>
      ) : (
        <Stepper ref={stepperRef} activeStep={activeStep} orientation="vertical" sx={{ 
          '& .MuiStepContent-root': { borderLeftColor: 'divider', ml: { xs: 1.5, md: 3 }, pl: { xs: 0.5, md: 3 }, borderLeft: { xs: 'none', md: '1px solid divider' } },
          '& .MuiStepLabel-root': { transition: 'all 0.3s ease' },
          '& .MuiStepIcon-root': { fontSize: 32, transition: 'transform 0.3s ease, color 0.3s ease' },
          '& .MuiStepIcon-root.Mui-active': { transform: 'scale(1.2)', filter: 'drop-shadow(0 0 8px rgba(225,29,42,0.5))' },
          '& .MuiStepIcon-root.Mui-completed': { color: 'success.main' },
        }}>
          
          {/* Adım 1: Tarih ve Saat Seçimi */}
          <Step>
            <StepLabel onClick={() => setActiveStep(0)} sx={{ cursor: 'pointer' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tarih ve Saat Seçimi</Typography>
            </StepLabel>
            <StepContent>
              <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                {mounted ? (
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="tr">
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                      <DateTimePicker
                        label="Başlangıç"
                        value={start}
                        minDateTime={dayjs().add(55, 'minute').second(0).millisecond(0)}
                        onChange={(newValue) => {
                          setStart(newValue as Dayjs);
                          if (newValue && newValue.isValid()) {
                            let duration = 60 * 60 * 1000;
                            if (start && start.isValid() && end && end.isValid()) duration = end.diff(start);
                            if (isNaN(duration) || duration < 60 * 60 * 1000) duration = 60 * 60 * 1000;
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
                      <Button 
                        variant="contained" 
                        size="large" 
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />} 
                        onClick={handleNextStep0} 
                        disabled={loading} 
                        sx={{ 
                          flexShrink: 0, 
                          height: 56, 
                          width: { xs: '100%', md: 'auto' },
                          boxShadow: '0 4px 15px rgba(225,29,42,0.3)',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          letterSpacing: '0.02em',
                          borderRadius: 2,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            boxShadow: '0 6px 20px rgba(225,29,42,0.45)',
                            transform: 'translateY(-2px)',
                          },
                          '&:active': {
                            transform: 'translateY(0) scale(0.98)',
                          },
                        }}
                      >
                        Müsaitliği Kontrol Et
                      </Button>
                    </Stack>
                  </LocalizationProvider>
                ) : (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: '100%', height: 56, bgcolor: 'action.hover', borderRadius: 1 }} />
                    <Box sx={{ width: '100%', height: 56, bgcolor: 'action.hover', borderRadius: 1 }} />
                    <Box sx={{ width: 200, height: 56, bgcolor: 'action.hover', borderRadius: 1, flexShrink: 0 }} />
                  </Stack>
                )}
              </Paper>
            </StepContent>
          </Step>

          {/* Adım 2: Masa Seçimi */}
          <Step>
            <StepLabel onClick={() => { if (activeStep > 1) setActiveStep(1) }} sx={{ cursor: activeStep > 1 ? 'pointer' : 'default' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Masa Seçimi</Typography>
            </StepLabel>
            <StepContent>
              <Box sx={{ pt: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Kat Seçimi</InputLabel>
                    <Select value={floor} label="Kat Seçimi" onChange={(e) => setFloor(e.target.value)}>
                      <MenuItem value="ALL">Tümü</MenuItem>
                      {Array.from(new Set(tables.map((t) => t.room?.floor).filter(Boolean))).sort().map((f) => (
                        <MenuItem key={f} value={f}>{f}. Kat</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Kategori</InputLabel>
                    <Select value={filter} label="Kategori" onChange={(e) => setFilter(e.target.value)}>
                      {categoriesList.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c === 'ALL' ? 'Tümü' : (categoryMeta[c]?.label ?? c)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                {loading && tables.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : filtered.length === 0 ? (
                  <Alert severity="info">Bu kriterlere uygun masa yok.</Alert>
                ) : (
                  <RoomLayout tables={filtered} floor={floor} onClickTable={toggleTable} selectedIds={selectedIds} />
                )}

                {/* Yapışkan Alt Bar (Sadece 2. adımdayken masa seçilmişse göster) */}
                {selectedTables.length > 0 && activeStep === 1 && (
                  <Portal>
                    <Paper
                    elevation={4}
                    sx={{
                      position: { xs: 'fixed', md: 'sticky' },
                      bottom: { xs: 16, md: 16 },
                      left: { xs: 16, md: 'auto' },
                      right: { xs: 16, md: 'auto' },
                      zIndex: { xs: 1300, md: 10 },
                      mt: { xs: 0, md: 4 },
                      p: 1.5,
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: 'primary.main',
                      bgcolor: 'background.paper',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}
                  >
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setBasketExpanded(!basketExpanded)}>
                      <Typography variant="body2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {selectedTables.length} Masa Seçili
                        <Typography component="span" variant="caption" color="text.secondary">
                          ({totalRate.toFixed(0)} ₺/saat)
                        </Typography>
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Button 
                          size="small" 
                          variant="contained" 
                          onClick={(e) => { e.stopPropagation(); handleReserveClick(); }}
                          startIcon={<RocketLaunch sx={{ fontSize: '16px !important' }} />}
                          sx={{
                            boxShadow: '0 4px 12px rgba(225,29,42,0.25)',
                            fontWeight: 700,
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 6px 18px rgba(225,29,42,0.4)',
                              transform: 'translateY(-1px)',
                            },
                          }}
                        >
                          Seçimi Tamamla
                        </Button>
                        <IconButton size="small">
                          {basketExpanded ? <ExpandMore /> : <ExpandLess />}
                        </IconButton>
                      </Stack>
                    </Stack>
                    <Collapse in={basketExpanded} sx={{ width: '100%' }}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Seçili:
                          </Typography>
                          {selectedTables.map((t) => (
                            <Chip key={t.id} label={`#${t.number}`} size="small" onDelete={() => toggleTable(t)} sx={{ fontWeight: 700 }} />
                          ))}
                        </Stack>
                        <Button size="small" variant="outlined" startIcon={<Clear />} onClick={clearSelection}>
                          Temizle
                        </Button>
                      </Box>
                    </Collapse>
                    </Paper>
                  </Portal>
                )}
              </Box>
            </StepContent>
          </Step>

          {/* Adım 3: Onay ve Detaylar */}
          <Step>
            <StepLabel>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Rezervasyon Onayı</Typography>
            </StepLabel>
            <StepContent>
              <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                <Stack spacing={3}>
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
                    sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper' } }}
                  />
                  <TextField
                    label="Not (opsiyonel)"
                    multiline
                    minRows={2}
                    value={confirmNotes}
                    onChange={(e) => setConfirmNotes(e.target.value)}
                    fullWidth
                    placeholder="Rezervasyonunuzla ilgili eklemek istediğiniz not..."
                    sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper' } }}
                  />

                  <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
                    <Button 
                      onClick={() => setActiveStep(1)} 
                      disabled={submitting} 
                      sx={{ 
                        flex: 1, 
                        fontWeight: 600,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.25s ease',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                      }}
                    >
                      Geri Dön
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleConfirmReserve} 
                      disabled={submitting || !confirmPhone.trim() || confirmPhone.trim().length < 10} 
                      startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
                      sx={{ 
                        flex: 2,
                        boxShadow: '0 4px 15px rgba(225,29,42,0.3)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        borderRadius: 2,
                        py: 1.5,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          boxShadow: '0 6px 20px rgba(225,29,42,0.45)',
                          transform: 'translateY(-2px)',
                        },
                        '&:active': {
                          transform: 'translateY(0) scale(0.98)',
                        },
                      }}
                    >
                      {submitting ? 'Gönderiliyor...' : 'Onayla ve Gönder'}
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            </StepContent>
          </Step>

        </Stepper>
      )}
    </Box>
  );
}
