'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { CheckCircle, Cancel, DoneAll, HourglassEmpty } from '@mui/icons-material';
import ReservationCard, { ReservationRow } from '@/components/reservations/ReservationCard';
import { RESERVATION_LABEL, ReservationStatus } from '@/lib/categories';

const filters: (ReservationStatus | 'ALL')[] = [
  'ALL',
  'HOLD',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

export default function AdminReservationsPage() {
  const [items, setItems] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations');
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

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) load();
      else setError((await res.json()).error);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.status === filter);

  const stats = useMemo(() => {
    const total = items.length;
    const hold = items.filter((i) => i.status === 'HOLD').length;
    const confirmed = items.filter((i) => i.status === 'CONFIRMED').length;
    return { total, hold, confirmed };
  }, [items]);

  const statCard = (label: string, value: number, color: string) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
        minWidth: 120,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, color }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Rezervasyonlar
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Tüm müşteri taleplerini incele ve durumlarını güncelle.
      </Typography>

      {/* İstatistikler */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
        {statCard('Toplam', stats.total, 'text.primary')}
        {statCard('Bekleyen', stats.hold, 'warning.main')}
        {statCard('Onaylı', stats.confirmed, 'success.main')}
      </Stack>

      {/* Filtreler */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {filters.map((f) => (
          <Chip
            key={f}
            label={f === 'ALL' ? 'Tümü' : RESERVATION_LABEL[f]}
            onClick={() => setFilter(f)}
            color={filter === f ? 'primary' : 'default'}
            variant={filter === f ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">Bu filtrede rezervasyon yok.</Alert>
      ) : (
        <Stack spacing={2}>
          {filtered.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              showOwner
              actions={
                <>
                  {r.status === 'HOLD' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => updateStatus(r.id, 'CONFIRMED')}
                        disabled={updatingId === r.id}
                      >
                        Onayla
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => updateStatus(r.id, 'CANCELLED')}
                        disabled={updatingId === r.id}
                      >
                        Reddet
                      </Button>
                    </>
                  )}
                  {r.status === 'CONFIRMED' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<DoneAll />}
                      onClick={() => updateStatus(r.id, 'COMPLETED')}
                      disabled={updatingId === r.id}
                    >
                      Tamamla
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
