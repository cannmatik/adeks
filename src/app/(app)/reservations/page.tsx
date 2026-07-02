'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Fade } from '@mui/material';
import ReservationEditDialog from '@/components/reservations/ReservationEditDialog';
import ReservationsEmptyState from '@/components/reservations/ReservationsEmptyState';
import ReservationsList from '@/components/reservations/ReservationsList';
import ReservationMessagesDialog from '@/components/reservations/ReservationMessagesDialog';
import ReservationsPageHeader from '@/components/reservations/ReservationsPageHeader';
import ReservationsSkeleton from '@/components/reservations/ReservationsSkeleton';
import { ReservationRow } from '@/components/reservations/ReservationCard';

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

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgReservationId, setMsgReservationId] = useState<string | null>(null);

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

  const openEdit = (reservation: ReservationRow) => {
    setEditItem(reservation);
    setEditStart(new Date(reservation.start_time).toISOString().slice(0, 16));
    setEditEnd(new Date(reservation.end_time).toISOString().slice(0, 16));
    setEditNotes(reservation.notes ?? '');
    setEditPhone(reservation.contact_phone ?? '');
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

  const { activeItems, pastItems } = useMemo(() => {
    return {
      activeItems: items.filter((reservation) => reservation.status !== 'CANCELLED' && reservation.status !== 'COMPLETED'),
      pastItems: items.filter((reservation) => reservation.status === 'CANCELLED' || reservation.status === 'COMPLETED'),
    };
  }, [items]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <ReservationsPageHeader />

      <Fade in={!!error}>
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
        </Box>
      </Fade>
      <Fade in={!!success}>
        <Box>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}
        </Box>
      </Fade>

      {loading ? (
        <ReservationsSkeleton />
      ) : items.length === 0 ? (
        <ReservationsEmptyState />
      ) : (
        <ReservationsList
          activeItems={activeItems}
          pastItems={pastItems}
          onCancel={handleCancel}
          onEdit={openEdit}
          onOpenMessages={(id) => {
            setMsgReservationId(id);
            setMsgOpen(true);
          }}
        />
      )}

      <ReservationMessagesDialog
        open={msgOpen}
        reservationId={msgReservationId}
        onClose={() => setMsgOpen(false)}
      />

      <ReservationEditDialog
        open={editOpen}
        saving={saving}
        start={editStart}
        end={editEnd}
        notes={editNotes}
        phone={editPhone}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
        onChangeStart={setEditStart}
        onChangeEnd={setEditEnd}
        onChangeNotes={setEditNotes}
        onChangePhone={setEditPhone}
      />
    </Box>
  );
}
