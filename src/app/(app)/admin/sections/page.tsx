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
import { Add, Delete, Edit, Map, MeetingRoom } from '@mui/icons-material';
import { RoomLite } from '@/components/tables/TableCard';
import { TableCategory } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';

const sizePresets = {
  small: { label: 'Küçük (6×4)', cols: 6, rows: 4 },
  medium: { label: 'Orta (8×5)', cols: 8, rows: 5 },
  large: { label: 'Büyük (10×6)', cols: 10, rows: 6 },
  xlarge: { label: 'Çok Büyük (12×8)', cols: 12, rows: 8 },
};

interface FormState {
  id?: string;
  name: string;
  floor: string;
  color: string;
  col_span: number;
  row_span: number;
  category: TableCategory | '';
  floor_col: number;
  floor_row: number;
  display_order: number;
}

const emptyForm: FormState = {
  name: '',
  floor: '1',
  color: '#7E7E85',
  col_span: 8,
  row_span: 5,
  category: '',
  floor_col: 0,
  floor_row: 0,
  display_order: 0,
};

export default function AdminSectionsPage() {
  const { categories: dbCategories, categoryMeta } = useCategories();
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/rooms');
    const data = await res.json();
    if (res.ok) setRooms(data.rooms);
    else setError(data.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ ...emptyForm, display_order: rooms.length });
    setDialogOpen(true);
  };

  const openEdit = (r: RoomLite) => {
    setForm({
      id: r.id,
      name: r.name,
      floor: r.floor ?? '1',
      color: r.color ?? '#7E7E85',
      col_span: r.col_span ?? 8,
      row_span: r.row_span ?? 5,
      category: r.category ?? '',
      floor_col: r.floor_col ?? 0,
      floor_row: r.floor_row ?? 0,
      display_order: r.display_order ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        category: form.category || null,
      };
      const res = form.id
        ? await fetch('/api/rooms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
    if (!confirm('Bu bölümü silmek istediğine emin misin? İçindeki masalar da silinecek.')) return;
    const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
    if (res.ok) load();
    else setError((await res.json()).error);
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Bölüm Yönetimi</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Bölümleri ekle, düzenle, koordinatlarını ayarla veya kaldır.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Map />} href="/admin/floor-plan" component="a">
            Salon Düzeni
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openNew}>
            Yeni Bölüm
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : rooms.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <MeetingRoom sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">Henüz bölüm eklenmemiş</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Yeni Bölüm butonuna tıklayarak bölüm ekleyebilirsiniz.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {rooms.map((r) => {
            const x1 = r.floor_col ?? 0;
            const y1 = r.floor_row ?? 0;
            const x2 = x1 + (r.col_span ?? 1);
            const y2 = y1 + (r.row_span ?? 1);
            const catLabel = r.category ? (categoryMeta[r.category]?.label ?? r.category) : null;

            return (
              <Card key={r.id}>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: r.color || '#7E7E85',
                          flexShrink: 0,
                          border: '2px solid',
                          borderColor: r.color ? `${r.color}60` : 'rgba(0,0,0,0.1)',
                        }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 100 }}>
                        {r.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${r.floor ?? '1'}. Kat`}
                        variant="outlined"
                      />
                      {catLabel && (
                        <Chip
                          size="small"
                          label={catLabel}
                          sx={{
                            bgcolor: `${categoryMeta[r.category!]?.color ?? '#7E7E85'}20`,
                            color: categoryMeta[r.category!]?.color ?? '#7E7E85',
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <Chip
                        size="small"
                        label={`${r.col_span ?? 1}×${r.row_span ?? 1}`}
                        variant="outlined"
                        sx={{ opacity: 0.8 }}
                      />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Koordinat: ({x1},{y1}) → ({x2},{y2})
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => openEdit(r)} size="small"><Edit /></IconButton>
                      <IconButton onClick={() => handleDelete(r.id)} size="small" color="error"><Delete /></IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{form.id ? 'Bölümü Düzenle' : 'Yeni Bölüm'}</span>
            {form.id && (
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  handleDelete(form.id!);
                  setDialogOpen(false);
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Bölüm Adı"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Kat"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                fullWidth
                placeholder="1, 2, Bahçe..."
              />
              <TextField
                label="Renk"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                fullWidth
                placeholder="#7E7E85"
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box
                        component="span"
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: form.color || '#7E7E85',
                          display: 'inline-block',
                          mr: 1,
                          border: '1px solid rgba(0,0,0,0.1)',
                        }}
                      />
                    ),
                  },
                }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Genişlik (Sütun)"
                type="number"
                value={form.col_span}
                onChange={(e) => setForm({ ...form, col_span: Math.max(1, Number(e.target.value)) })}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Yükseklik (Satır)"
                type="number"
                value={form.row_span}
                onChange={(e) => setForm({ ...form, row_span: Math.max(1, Number(e.target.value)) })}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="X Pozisyonu (Sütun)"
                type="number"
                value={form.floor_col}
                onChange={(e) => setForm({ ...form, floor_col: Math.max(0, Number(e.target.value)) })}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Y Pozisyonu (Satır)"
                type="number"
                value={form.floor_row}
                onChange={(e) => setForm({ ...form, floor_row: Math.max(0, Number(e.target.value)) })}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Koordinat: ({form.floor_col},{form.floor_row}) → ({form.floor_col + form.col_span},{form.floor_row + form.row_span})
            </Typography>
            <TextField
              select
              label="Kategori (isteğe bağlı)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TableCategory | '' })}
              fullWidth
            >
              <MenuItem value="">— Seçilmedi —</MenuItem>
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Sıralama"
              type="number"
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
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
