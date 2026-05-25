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
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import RoomLayout from '@/components/tables/RoomLayout';
import { CafeTable } from '@/components/tables/TableCard';
import { CATEGORY_META } from '@/lib/categories';

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
  const ms = Date.now() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
}

export default function AdminSessionsPage() {
  const supabase = createClient();
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [members, setMembers] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<CafeTable | null>(null);
  const [kind, setKind] = useState<'MEMBER' | 'ANONYMOUS'>('ANONYMOUS');
  const [memberId, setMemberId] = useState('');
  const [anonLabel, setAnonLabel] = useState('Misafir');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const [tRes, sRes, mRes] = await Promise.all([
      fetch('/api/tables'),
      fetch('/api/sessions?active=1'),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'customer'),
    ]);
    const tData = await tRes.json();
    const sData = await sRes.json();
    if (!tRes.ok) setError(tData.error);
    else setTables(tData.tables);
    if (!sRes.ok) setError(sData.error);
    else setSessions(sData.sessions);
    if (mRes.data) setMembers(mRes.data as ProfileLite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase
      .channel('admin-sessions-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => load())
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
      const rate = Number(s?.hourly_rate_snapshot ?? CATEGORY_META[t.category].defaultRate);
      const ms = s ? Date.now() - new Date(s.started_at).getTime() : 0;
      const estimated = s ? Math.round((ms / 3_600_000) * rate) : 0;
      return {
        ...t,
        booking_status: s ? 'IN_USE' : (t.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE'),
        session: s ? {
          kind: s.kind,
          user_name: s.kind === 'MEMBER' ? (s.user?.full_name || s.user?.email) : (s.anonymous_label || 'Misafir'),
          elapsed: elapsed(s.started_at),
          estimated: estimated > 0 ? `${estimated} ₺` : '0 ₺',
        } : null,
      } as CafeTable;
    });
  }, [tables, sessionsByTable]);

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

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Anlık Masa Durumu</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Masa üzerine tıklayarak oturum başlat veya bitir.
          </Typography>
        </Box>
        <IconButton onClick={load} title="Yenile">
          <Refresh />
        </IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <RoomLayout tables={layoutTables} onClickTable={handleTableClick} />
      )}

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
    </Box>
  );
}
