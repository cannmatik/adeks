'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, Typography, Alert, CircularProgress, Paper, TextField, Collapse, IconButton, Stepper, Step, StepLabel, StepContent, FormControl, InputLabel, Select, MenuItem, Portal, Dialog, DialogTitle, DialogContent, DialogActions, Drawer, Badge, Fab, Tooltip, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { EventAvailable, Clear, DateRange, Search, TouchApp, ExpandLess, ExpandMore, CheckCircle, RocketLaunch, Send, ShoppingCart, Check, Close as CloseIcon, Delete, TableRestaurant, AttachMoney } from '@mui/icons-material';
import { CafeTable } from '@/components/tables/TableCard';
import RoomLayout, { Legend } from '@/components/tables/RoomLayout';
import { useColorScheme, useTheme } from '@mui/material/styles';
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
  const [pricesOpen, setPricesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const theme = useTheme();
  const { mode } = useColorScheme();
  const isDark = mode === 'dark' || theme.palette.mode === 'dark';

  const [cartOpen, setCartOpen] = useState(false);
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
      return false;
    } finally {
      setLoading(false);
    }
    return true;
  }, []);

  const handleNextStep0 = async () => {
    setSelectedIds(new Set());
    const success = await load();
    if (success) {
      setActiveStep(1);
    }
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

  const priceRows = dbCategories
    .filter((c) => (categoryMeta[c.name]?.defaultRate ?? 0) > 0)
    .map((c, i) => ({ id: i, ...c }));



  return (
    <Box>
      <Box ref={headerRef} sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ 
            mb: 0.5, 
            fontSize: { xs: '1.5rem', md: '2.125rem' }, 
            fontWeight: 800,
            color: 'text.primary',
          }}>Salon Düzeni</Typography>
          <Typography variant="body2" color="text.secondary">Rezervasyon adımlarını takip ederek işlemlerinizi hızlıca tamamlayın.</Typography>
        </Box>
        <Button variant="outlined" color="primary" startIcon={<AttachMoney />} sx={{ fontWeight: 700, borderRadius: 2 }} onClick={() => setPricesOpen(true)}>
          Kategori Ücretleri
        </Button>
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
          '& .MuiStepIcon-root': { fontSize: 32, transition: 'font-size 0.3s ease, filter 0.3s ease, color 0.3s ease', overflow: 'visible' },
          '& .MuiStepIcon-root.Mui-active': { fontSize: 40, filter: 'drop-shadow(0 4px 12px rgba(225,29,42,0.4))' },
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
                          if (!newValue || !newValue.isValid()) return;
                          setStart(newValue);
                          let duration = 60 * 60 * 1000;
                          if (start && start.isValid() && end && end.isValid()) duration = end.diff(start);
                          if (isNaN(duration) || duration < 60 * 60 * 1000) duration = 60 * 60 * 1000;
                          setEnd(newValue.add(duration, 'millisecond'));
                        }}
                        sx={{ width: '100%' }}
                      />
                      <DateTimePicker
                        label="Bitiş"
                        value={end}
                        minDateTime={start && start.isValid() ? start.add(1, 'hour') : undefined}
                        onChange={(newValue) => {
                          if (!newValue || !newValue.isValid()) return;
                          setEnd(newValue);
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
              <Box sx={{ pt: 1, position: 'relative' }}>
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

                <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'block' } }}>
                  <Legend isDark={isDark} categoryMeta={categoryMeta} />
                </Box>

                {loading && tables.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : filtered.length === 0 ? (
                  <Alert severity="info">Bu kriterlere uygun masa yok.</Alert>
                ) : (
                  <RoomLayout tables={filtered} floor={floor} onClickTable={toggleTable} selectedIds={selectedIds} onCartClick={() => setCartOpen(true)} />
                )}

                {/* Yüzen Butonlar (Sepet ve Tamamla) */}
                {selectedTables.length > 0 && activeStep === 1 && (
                  <Portal>
                    <Box
                      sx={{
                        position: 'fixed',
                        bottom: { xs: 24, md: 40 },
                        right: { xs: 24, md: 40 },
                        zIndex: 1500,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                      }}
                    >
                      <Tooltip title="Rezervasyon Detayları" placement="left">
                        <Fab
                          onClick={(e) => { e.stopPropagation(); setCartOpen(true); }}
                          sx={{ 
                            width: 64,
                            height: 64,
                            alignSelf: 'flex-end',
                            bgcolor: 'background.paper',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              bgcolor: 'background.paper',
                              transform: 'translateY(-4px) scale(1.05)',
                              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                            }
                          }}
                        >
                          <Badge 
                            badgeContent={selectedTables.length} 
                            color="error" 
                            sx={{ 
                              '& .MuiBadge-badge': { 
                                fontWeight: 800, 
                                fontSize: '0.85rem',
                                height: 24,
                                minWidth: 24,
                                border: '2.5px solid', 
                                borderColor: 'background.paper',
                                transform: 'scale(1) translate(30%, -30%)'
                              } 
                            }}
                          >
                            <TableRestaurant color="primary" sx={{ fontSize: 32 }} />
                          </Badge>
                        </Fab>
                      </Tooltip>
                      <Fab
                        variant="extended"
                        onClick={(e) => { e.stopPropagation(); handleReserveClick(); }}
                        sx={{ 
                          height: 64,
                          px: 4,
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #e11d2a 0%, #ba1520 100%)',
                          color: '#fff',
                          boxShadow: '0 8px 32px rgba(225,29,42,0.4)',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          textTransform: 'none',
                          letterSpacing: '0.02em',
                          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.1s backwards',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 12px 40px rgba(225,29,42,0.5)',
                            background: 'linear-gradient(135deg, #ed2533 0%, #c81925 100%)',
                          },
                          '&:active': {
                            transform: 'translateY(0) scale(0.98)',
                          }
                        }}
                      >
                        Tamamla <Check sx={{ ml: 1, fontSize: 28 }} />
                      </Fab>
                      <style>{`
                        @keyframes popIn {
                          0% { transform: scale(0.5); opacity: 0; }
                          100% { transform: scale(1); opacity: 1; }
                        }
                      `}</style>
                    </Box>
                  </Portal>
                )}
              </Box>
            </StepContent>
          </Step>

        </Stepper>
      )}

      {/* Sepet Çekmecesi (Drawer) */}
      <Drawer
        anchor="bottom"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        sx={{ 
          zIndex: 1600,
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '85vh',
            bgcolor: 'background.default',
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TableRestaurant color="primary" /> Rezervasyon Detayları
          </Typography>
          <IconButton onClick={() => setCartOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2, overflowY: 'auto' }}>
          {start && end && start.isValid() && end.isValid() && (
            <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Seçilen Zaman Aralığı</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {start.toDate().toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} — 
                {end.toDate().toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Paper>
          )}
          {selectedTables.length === 0 ? (
            <Alert severity="info">Henüz masa seçilmedi.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {selectedTables.map((t) => (
                <Paper key={t.id} elevation={0} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Masa #{t.number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.room?.name || 'Oda'} • {t.room?.floor}. Kat
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => toggleTable(t)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'baseline' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tahmini Ücret</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {estimatedTotal.toFixed(0)} ₺
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            fullWidth 
            size="large"
            disabled={selectedTables.length === 0}
            onClick={() => { setCartOpen(false); handleReserveClick(); }}
            sx={{ fontWeight: 800, py: 1.5, borderRadius: 2, boxShadow: '0 8px 24px rgba(225,29,42,0.3)' }}
          >
            Rezervasyonu Tamamla
          </Button>
        </Box>
      </Drawer>

      {/* Sepet Onay Dialogu */}
      <Dialog 
        open={activeStep === 2} 
        onClose={() => !submitting && setActiveStep(1)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': { borderRadius: 3, p: { xs: 1, sm: 2 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 1 }}>
          Rezervasyon Özeti
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Tarih Aralığı</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {start?.isValid() ? start.toDate().toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} — 
                  {end?.isValid() ? end.toDate().toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </Typography>
              </Box>
              <Button size="small" onClick={() => setActiveStep(0)}>Düzenle</Button>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Seçili Masalar</Typography>
                <Typography variant="body2" color="text.secondary">{selectedTables.length} Adet</Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {selectedTables.map((t) => (
                  <Chip key={t.id} label={`#${t.number}`} color="primary" variant="outlined" onDelete={() => toggleTable(t)} />
                ))}
              </Stack>
              {selectedTables.length === 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>Masa seçimi yapmadınız!</Alert>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Tahmini Ücret</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {estimatedTotal.toFixed(0)} ₺
              </Typography>
            </Box>

            <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
              <Typography variant="caption">
                Rezervasyonunuz yönetici onayından sonra kesinleşecektir.
              </Typography>
            </Alert>

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
              placeholder="Eklemek istediğiniz not..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button 
            onClick={() => setActiveStep(1)} 
            disabled={submitting} 
            fullWidth
            sx={{ mb: { xs: 1, sm: 0 } }}
          >
            İptal
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmReserve} 
            disabled={submitting || selectedTables.length === 0 || !confirmPhone.trim() || confirmPhone.trim().length < 10} 
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
            fullWidth
            sx={{ fontWeight: 700, py: 1.2 }}
          >
            {submitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={pricesOpen} onClose={() => setPricesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Kategori Ücretleri ve Özellikleri</DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: 'background.paper' }}>
          {priceRows.map((c) => {
            const label = categoryMeta[c.name]?.label ?? c.name;
            const color = categoryMeta[c.name]?.color || '#ccc';
            const rate = categoryMeta[c.name]?.defaultRate ?? 0;
            const dbFeatures = categoryMeta[c.name]?.features;
            const specs = dbFeatures && dbFeatures.length > 0 ? dbFeatures : null;
            
            return (
              <Accordion key={c.name} disableGutters elevation={0} sx={{
                border: '1px solid',
                borderColor: 'divider',
                mb: 1,
                borderRadius: '8px !important',
                '&:before': { display: 'none' }
              }}>
                <AccordionSummary expandIcon={specs ? <ExpandMore /> : null} sx={{ px: 2 }}>
                  <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', pr: specs ? 2 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: color }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {label}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 800 }}>
                      ₺{rate}
                    </Typography>
                  </Box>
                </AccordionSummary>
                {specs && (
                  <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
                    <Stack spacing={0.75} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      {specs.map((spec, idx) => (
                        <Typography key={idx} variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Box component="span" sx={{ color: 'primary.main', fontSize: '1rem', lineHeight: 1 }}>•</Box> 
                          {spec}
                        </Typography>
                      ))}
                    </Stack>
                  </AccordionDetails>
                )}
              </Accordion>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPricesOpen(false)} sx={{ fontWeight: 600 }}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
