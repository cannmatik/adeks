'use client';

import { useEffect, useMemo, useState } from 'react';
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
  MenuItem,
  Stack,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Badge,
} from '@mui/material';
import { Refresh, ViewSidebar, Event, AccessTime, MarkChatUnread, ChatBubbleOutlined, InfoOutlined } from '@mui/icons-material';
import ReservationDetails from '@/components/admin/ReservationDetails';
import { createClient } from '@/lib/supabase/client';
import RoomLayout from '@/components/tables/RoomLayout';
import { CafeTable } from '@/components/tables/TableCard';
import { useCategories } from '@/components/CategoryProvider';
import ChatPanel from '@/components/messages/ChatPanel';

interface ActiveSession {
  id: string;
  table_id: string;
  kind: 'MEMBER' | 'ANONYMOUS';
  user_id: string | null;
  anonymous_label: string | null;
  reservation_id: string | null;
  started_at: string;
  hourly_rate_snapshot: number | string | null;
  user: { id: string; full_name: string | null; email: string | null } | null;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

function elapsed(start: string) {
  const ms = Math.max(0, Date.now() - new Date(start).getTime());
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${h > 0 ? `${h} sa ` : ''}${m} dk ${s} sn`;
}

export default function AdminSessionsPage() {
  const { categoryMeta } = useCategories();
  const supabase = createClient();
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [members, setMembers] = useState<ProfileLite[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeTicker, setTimeTicker] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTicker((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<CafeTable | null>(null);
  const [kind, setKind] = useState<'MEMBER' | 'ANONYMOUS'>('ANONYMOUS');
  const [memberId, setMemberId] = useState('');
  const [anonLabel, setAnonLabel] = useState('Misafir');
  const [saving, setSaving] = useState(false);

  const [resDialogLoading, setResDialogLoading] = useState(false);
  const [resDialogError, setResDialogError] = useState('');

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgReservationId, setMsgReservationId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    const [tRes, sRes, mRes, rRes] = await Promise.all([
      fetch('/api/tables'),
      fetch('/api/sessions?active=1'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'customer'),
      fetch('/api/reservations?scope=all')
    ]);
    const tData = await tRes.json();
    const sData = await sRes.json();
    const rData = rRes.ok ? await rRes.json() : { reservations: [] };
    
    if (!tRes.ok) setError(tData.error);
    else setTables(tData.tables);
    if (!sRes.ok) setError(sData.error);
    else setSessions(sData.sessions);
    if (mRes.data) setMembers(mRes.data as ProfileLite[]);

    if (rRes.ok) {
      const now = new Date();
      const upcoming = (rData.reservations || []).filter((r: any) => {
        if (r.status !== 'HOLD' && r.status !== 'CONFIRMED') return false;
        const endTime = new Date(r.end_time);
        return endTime >= now;
      });
      upcoming.sort((a: any, b: any) => {
        const aUnread = a.unread_count > 0 ? 1 : 0;
        const bUnread = b.unread_count > 0 ? 1 : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
      setReservations(upcoming);
    }
    
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel('admin-sessions-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sessionsByTable = useMemo(() => {
    const map = new Map<string, ActiveSession>();
    for (const s of sessions) map.set(s.table_id, s);
    return map;
  }, [sessions]);

  // Masaları RoomLayout için hazırla
  const layoutTables = useMemo(() => {
    return tables.map((t) => {
      const s = sessionsByTable.get(t.id);
      const rate = Number(s?.hourly_rate_snapshot ?? (categoryMeta[t.category]?.defaultRate ?? 0));
      const ms = s ? Date.now() - new Date(s.started_at).getTime() : 0;
      const estimated = s ? Math.round((ms / 3_600_000) * rate) : 0;
      
      // Sadece şu an devam eden veya 1 saat içinde başlayacak rezervasyonları haritada göster
      const nowMs = Date.now();
      const tReservations = reservations.filter((r) => {
        if (!r.tables?.some((rt: any) => rt.table?.id === t.id)) return false;
        const startMs = new Date(r.start_time).getTime();
        const endMs = new Date(r.end_time).getTime();
        return nowMs <= endMs && startMs - nowMs <= 60 * 60 * 1000;
      });
      
      let booking_status: string = 'AVAILABLE';
      if (s) {
        booking_status = 'IN_USE';
      } else if (tReservations.length > 0) {
        // En yakındaki rezervasyonu al
        booking_status = tReservations[0].status;
      } else if (t.status === 'MAINTENANCE') {
        booking_status = 'MAINTENANCE';
      }

      return {
        ...t,
        booking_status,
        session: s ? {
          kind: s.kind,
          user_name: s.kind === 'MEMBER' ? (s.user?.full_name || s.user?.email) : (s.anonymous_label || 'Misafir'),
          elapsed: elapsed(s.started_at),
          estimated: estimated > 0 ? `${estimated} ₺` : '0 ₺',
        } : null,
      } as CafeTable;
    });
  }, [tables, sessionsByTable, timeTicker, reservations, categoryMeta]);

  const handleTableClick = (t: CafeTable) => {
    const s = sessionsByTable.get(t.id);
    if (s) {
      const name = s.kind === 'MEMBER' ? (s.user?.full_name || s.user?.email) : (s.anonymous_label || 'Misafir');
      if (confirm(`Masa #${t.number} kapatılsın mı?\n${s.kind === 'MEMBER' ? 'Üye' : 'Anonim'}: ${name}`)) {
        endSession(s.id);
      }
    } else if (t.status !== 'MAINTENANCE') {
      openStartDialog(t);
    }
  };

  const openStartDialog = (t: CafeTable) => {
    setSelectedTable(t);
    setKind('ANONYMOUS');
    setMemberId('');
    setAnonLabel(`Misafir ${tables.findIndex((x) => x.id === t.id) + 1}`);
    setOpenDialog(true);
  };

  const startSession = async () => {
    if (!selectedTable) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable.id,
          kind,
          user_id: kind === 'MEMBER' ? memberId : null,
          anonymous_label: kind === 'ANONYMOUS' ? anonLabel : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Başlatılamadı');
      setOpenDialog(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const endSession = async (id: string) => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end: true }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  };

  const handleReservationAction = async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    setResDialogLoading(true);
    setResDialogError('');
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      setDetailsData(null);
      load();
    } catch (err: any) {
      setResDialogError(err.message);
    } finally {
      setResDialogLoading(false);
    }
  };

  const deleteReservation = async (id: string) => {
    if (!confirm('Bu rezervasyonu silmek istediğinize emin misiniz?')) return;
    setResDialogLoading(true);
    setResDialogError('');
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDetailsData(null);
        load();
      } else {
        setResDialogError((await res.json()).error);
      }
    } catch (err: any) {
      setResDialogError(err.message);
    } finally {
      setResDialogLoading(false);
    }
  };

  const handleOpenAllTables = async (reservation: any) => {
    if (!reservation?.tables || reservation.tables.length === 0) return;
    setResDialogLoading(true);
    setResDialogError('');
    try {
      // 1. Her bir masa için session başlat
      const promises = reservation.tables.map((rt: any) => 
        fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_id: rt.table.id,
            kind: 'MEMBER',
            user_id: reservation.user_id,
            reservation_id: reservation.id,
          }),
        })
      );
      const results = await Promise.all(promises);
      for (const res of results) {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Oturum başlatılırken hata oluştu');
        }
      }

      // 2. Rezervasyon durumunu COMPLETED yap (aynı zamanda telefonu silecek)
      const patchRes = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (!patchRes.ok) {
         const data = await patchRes.json();
         throw new Error(data.error || 'Rezervasyon durumu güncellenemedi');
      }

      load();
    } catch (err: any) {
      setResDialogError(err.message);
    } finally {
      setResDialogLoading(false);
    }
  };

  return (
    <Box sx={{ height: { md: 'calc(100vh - 120px)' }, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>Anlık Masa Durumu</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Masa üzerine tıklayarak oturum başlat veya bitir.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => load()} title="Yenile">
            <Refresh />
          </IconButton>
          <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} title="Paneli Aç/Kapat" color={sidebarOpen ? 'primary' : 'default'}>
            <ViewSidebar />
          </IconButton>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexGrow: 1, gap: 3, minHeight: 0, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Main Area: RoomLayout */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', pr: { md: 1 } }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <RoomLayout tables={layoutTables} onClickTable={handleTableClick} allowOccupiedClick={true} />
          )}
        </Box>

        {/* Sidebar Panel */}
        {sidebarOpen && (
          <Paper
            elevation={0}
            sx={{
              width: { xs: '100%', md: 450 },
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              border: '1.5px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              bgcolor: 'background.default'
            }}
          >
            {/* Açık Masalar */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', maxHeight: { xs: 400, md: '50%' } }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1, flexShrink: 0 }}>
                <AccessTime fontSize="small" color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Açık Masalar</Typography>
                <Chip size="small" label={sessions.length} color="primary" variant="outlined" sx={{ ml: 'auto', fontWeight: 700 }} />
              </Stack>
              <List sx={{ p: 0, overflow: 'auto', flexGrow: 1 }}>
                {sessions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Şu an açık masa yok.</Typography>
                ) : (
                  sessions.map((s) => {
                    const t = tables.find((x) => x.id === s.table_id);
                    const name = s.kind === 'MEMBER' ? (s.user?.full_name || s.user?.email) : (s.anonymous_label || 'Misafir');
                    const rate = Number(s?.hourly_rate_snapshot ?? (t ? categoryMeta[t.category]?.defaultRate : 0));
                    const ms = Date.now() - new Date(s.started_at).getTime();
                    const estimated = Math.round((ms / 3_600_000) * rate);
                    return (
                      <ListItem key={s.id} sx={{ px: 0, py: 1.5, borderBottom: '1px dashed', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                        <ListItemText
                          disableTypography
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                              {`Masa #${t?.number ?? '?'}`}
                            </Typography>
                          }
                          secondary={
                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                <Box component="span" sx={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', bgcolor: s.kind === 'MEMBER' ? 'success.main' : 'warning.main' }} />
                                {s.kind === 'MEMBER' ? 'Üye' : 'Anonim'} — {name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                ⏱ {elapsed(s.started_at)} · 💰 {estimated} ₺
                              </Typography>
                            </Stack>
                          }
                        />
                        <Button size="small" variant="outlined" color="error" onClick={() => t && handleTableClick(t)} sx={{ ml: 1, minWidth: 'auto', px: 1.5, fontWeight: 700, borderRadius: 2 }}>
                          Kapat
                        </Button>
                      </ListItem>
                    );
                  })
                )}
              </List>
            </Box>
            
            {/* Yaklaşan Randevular */}
            <Box sx={{ p: 2, bgcolor: 'background.paper', flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1, flexShrink: 0 }}>
                <Event fontSize="small" color="secondary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Yaklaşan Randevular</Typography>
                {reservations.filter((r) => r.unread_count > 0).length > 0 && (
                  <Typography variant="caption" sx={{ fontWeight: 800, ml: 1, px: 1, py: 0.5, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1 }}>
                    {reservations.filter((r) => r.unread_count > 0).length} Yeni Mesaj
                  </Typography>
                )}
                <Chip size="small" label={reservations.length} color="secondary" variant="outlined" sx={{ ml: 'auto', fontWeight: 700 }} />
              </Stack>
              <List sx={{ p: 0, pr: 1, flexGrow: 1, overflow: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' } }}>
                {reservations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Yaklaşan randevu yok.</Typography>
                ) : (
                  reservations.map((r) => {
                    const startTime = new Date(r.start_time);
                    const endTime = new Date(r.end_time);
                    const statusColor = r.status === 'HOLD' ? 'warning.main' : 'success.main';
                    return (
                      <ListItem 
                        key={r.id} 
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            color={r.unread_count > 0 ? "primary" : "default"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMsgReservationId(r.id);
                              setMsgOpen(true);
                            }}
                          >
                            <Badge color="error" variant="dot" invisible={!(r.unread_count > 0)}>
                              {r.unread_count > 0 ? <MarkChatUnread color="primary" /> : <ChatBubbleOutlined sx={{ opacity: 0.3 }} />}
                            </Badge>
                          </IconButton>
                        }
                        sx={{ px: 0, py: 1.5, borderBottom: '1px dashed', borderColor: 'divider', '&:last-child': { borderBottom: 'none' }, pr: 6 }}
                      >
                        <ListItemText
                          disableTypography
                          sx={{ cursor: 'pointer', m: 0 }}
                          onClick={() => setDetailsData(r)}
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {r.owner?.full_name || r.owner?.email || 'Bilinmiyor'}
                            </Typography>
                          }
                          secondary={
                            <Stack spacing={1} sx={{ mt: 1 }}>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {r.tables?.map((rt: any) => (
                                  <Chip key={rt.table?.id} label={`#${rt.table?.number}`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, borderRadius: 1 }} />
                                ))}
                              </Box>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                  {startTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} {startTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                                <Typography variant="caption" sx={{ color: statusColor, fontWeight: 700 }}>
                                  {r.status === 'HOLD' ? 'Beklemede' : 'Onaylı'}
                                </Typography>
                              </Stack>
                            </Stack>
                          }
                        />
                      </ListItem>
                    );
                  })
                )}
              </List>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Dialogs */}
      <Dialog open={openDialog} onClose={() => !saving && setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Masa #{selectedTable?.number} — Oturum Başlat</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Tür"
              value={kind}
              onChange={(e) => setKind(e.target.value as 'MEMBER' | 'ANONYMOUS')}
              fullWidth
            >
              <MenuItem value="ANONYMOUS">Anonim / Walk-in</MenuItem>
              <MenuItem value="MEMBER">Üye</MenuItem>
            </TextField>
            {kind === 'MEMBER' ? (
              <TextField
                select
                label="Üye"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                fullWidth
              >
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.full_name} — {m.email}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Etiket"
                value={anonLabel}
                onChange={(e) => setAnonLabel(e.target.value)}
                fullWidth
                helperText="Örn: Misafir 7, Walk-in #34"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>İptal</Button>
          <Button variant="contained" onClick={startSession} disabled={saving || (kind === 'MEMBER' && !memberId)}>
            {saving ? 'Açılıyor...' : 'Oturumu Başlat'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mesajlaşma Dialogu */}
      <Dialog
        open={msgOpen}
        onClose={() => { setMsgOpen(false); load(); }}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { height: '70vh' } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>Rezervasyon Mesajları</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {msgReservationId && <ChatPanel reservationId={msgReservationId} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsData} onClose={() => setDetailsData(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Rezervasyon Detayları</DialogTitle>
        <DialogContent dividers>
          {resDialogError && <Alert severity="error" sx={{ mb: 2 }}>{resDialogError}</Alert>}
          {detailsData && (
            <ReservationDetails 
              reservation={detailsData} 
              onUpdateStatus={handleReservationAction}
              onDelete={deleteReservation}
              extraActions={
                detailsData.status === 'CONFIRMED' && (
                  <Button size="small" variant="contained" color="secondary" onClick={() => handleOpenAllTables(detailsData)} disabled={resDialogLoading}>
                    {resDialogLoading ? 'Açılıyor...' : 'Tüm Masaları Aç'}
                  </Button>
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
