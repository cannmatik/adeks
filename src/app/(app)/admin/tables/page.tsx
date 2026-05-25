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
import { CafeTable } from '@/components/tables/TableCard';
import CategoryBadge from '@/components/tables/CategoryBadge';
import {
  CATEGORY_META,
  STATUS_COLOR,
  STATUS_LABEL,
  TableCategory,
  TableStatus,
} from '@/lib/categories';

const categories: TableCategory[] = ['SILVER', 'GOLD', 'PLATINUM', 'PLATINUM_PLUS', 'ELITE', 'STREAM_RENDER', 'GARDEN'];
const statuses: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

interface FormState {
  id?: string;
  number: number;
  category: TableCategory;
  status: TableStatus;
  notes: string;
}

const emptyForm: FormState = {
  number: 0,
  category: 'SILVER',
  status: 'AVAILABLE',
  notes: '',
};

export default function AdminTablesPage() {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/tables');
    const data = await res.json();
    if (res.ok) setTables(data.tables);
    else setError(data.error);
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
                    <Typography variant="h5" sx={{ minWidth: 56, color: CATEGORY_META[t.category].color }}>
                      #{t.number}
                    </Typography>
                    <CategoryBadge category={t.category} />
                    <Chip
                      size="small"
                      label={STATUS_LABEL[t.status]}
                      color={STATUS_COLOR[t.status]}
                      variant="outlined"
                    />
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {CATEGORY_META[t.category].defaultRate} ₺/saat
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
              {categories.map((c) => (
                <MenuItem key={c} value={c}>{CATEGORY_META[c].label}</MenuItem>
              ))}
            </TextField>
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
