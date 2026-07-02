'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import { Add, Delete, Edit, Map } from '@mui/icons-material';
import { CafeTable, RoomLite } from '@/components/tables/TableCard';
import CategoryBadge from '@/components/tables/CategoryBadge';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  TableCategory,
  TableStatus,
} from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';

const statuses: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

interface FormState {
  id?: string;
  number: number;
  category: TableCategory;
  status: TableStatus;
  notes: string;
  shape: string;
  room_id: string;
  position_x: number;
  position_y: number;
}

const emptyForm: FormState = {
  number: 0,
  category: 'SILVER',
  status: 'AVAILABLE',
  notes: '',
  shape: 'SQUARE',
  room_id: '',
  position_x: 0,
  position_y: 0,
};

export default function AdminTablesPage() {
  const { categories: dbCategories, categoryMeta } = useCategories();
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [tablesRes, roomsRes] = await Promise.all([
      fetch('/api/tables'),
      fetch('/api/rooms'),
    ]);
    const tablesData = await tablesRes.json();
    const roomsData = await roomsRes.json();
    
    if (tablesRes.ok) setTables(tablesData.tables);
    else setError(tablesData.error);
    
    if (roomsRes.ok) setRooms(roomsData.rooms || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    const nextNumber = (tables.reduce((max, t) => Math.max(max, t.number), 0) || 0) + 1;
    setForm({ ...emptyForm, number: nextNumber });
    setDialogOpen(true);
  };

  const openEdit = (t: CafeTable) => {
    setForm({
      id: t.id,
      number: t.number,
      category: t.category,
      status: t.status,
      // hourly_rate artık tables tablosunda yok, kategoriden gelir
      notes: t.notes ?? '',
      shape: t.shape ?? 'SQUARE',
      room_id: t.room?.id ?? '',
      position_x: t.position_x ?? 0,
      position_y: t.position_y ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { ...form };
      const res = form.id
        ? await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi');
      setDialogOpen(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu masayı silmek istediğine emin misin?')) return;
    const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' });
    if (res.ok) load();
    else setError((await res.json()).error);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Masa Yönetimi</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Yeni masa ekle, düzenle veya kaldır.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Map />} href="/admin/floor-plan" component="a">
            Salon Düzeni
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openNew}>
            Yeni Masa
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {tables.map((t) => (
            <Card key={t.id}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ minWidth: 56, color: categoryMeta[t.category]?.color ?? '#C0C0C0' }}>
                      #{t.number}
                    </Typography>
                    {t.room && (
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {t.room.name}
                      </Typography>
                    )}
                    <CategoryBadge category={t.category} />
                    <Chip
                      size="small"
                      label={STATUS_LABEL[t.status]}
                      color={STATUS_COLOR[t.status]}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={t.shape === 'ROUND' ? 'Yuvarlak' : 'Kare'}
                      variant="outlined"
                      sx={{ opacity: 0.8 }}
                    />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {categoryMeta[t.category]?.defaultRate ?? 0} ₺/saat
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => openEdit(t)} size="small"><Edit /></IconButton>
                    <IconButton onClick={() => handleDelete(t.id)} size="small" color="error"><Delete /></IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{form.id ? 'Masayı Düzenle' : 'Yeni Masa'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Numara"
              type="number"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              select
              label="Kategori"
              value={form.category}
              onChange={(e) => {
                const cat = e.target.value as TableCategory;
                setForm({ ...form, category: cat });
              }}
              fullWidth
            >
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Bölüm"
              value={form.room_id}
              onChange={(e) => {
                const newRoomId = e.target.value;
                const newRoom = rooms.find(r => r.id === newRoomId);
                setForm({ 
                  ...form, 
                  room_id: newRoomId,
                  // If the room has a category, set it as default but user can still change it
                  category: (newRoom?.category || form.category) as TableCategory
                });
              }}
              fullWidth
            >
              <MenuItem value="">— Seçilmedi —</MenuItem>
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="X Pozisyonu"
                type="number"
                value={form.position_x}
                onChange={(e) => setForm({ ...form, position_x: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Y Pozisyonu"
                type="number"
                value={form.position_y}
                onChange={(e) => setForm({ ...form, position_y: Number(e.target.value) })}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
            <TextField
              select
              label="Durum"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TableStatus })}
              fullWidth
            >
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Şekil"
              value={form.shape}
              onChange={(e) => setForm({ ...form, shape: e.target.value })}
              fullWidth
            >
              <MenuItem value="SQUARE">Kare</MenuItem>
              <MenuItem value="ROUND">Yuvarlak</MenuItem>
            </TextField>
            <TextField
              label="Not (opsiyonel)"
              multiline
              minRows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>İptal</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
