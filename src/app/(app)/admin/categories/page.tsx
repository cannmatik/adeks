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
  Stack,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Add, Delete, Edit, Refresh, Category as CategoryIcon } from '@mui/icons-material';
import { useCategories } from '@/components/CategoryProvider';

interface FormState {
  name: string;
  label: string;
  hourly_rate: number;
  color: string;
  description: string;
}

const emptyForm: FormState = {
  name: '',
  label: '',
  hourly_rate: 0,
  color: '#C0C0C0',
  description: '',
};

export default function AdminCategoriesPage() {
  const { categories, refreshCategories } = useCategories();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      await refreshCategories();
    } catch (err: any) {
      setError(err.message || 'Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setIsEdit(false);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setIsEdit(true);
    setForm({
      name: c.name,
      label: c.label,
      hourly_rate: Number(c.hourly_rate),
      color: c.color || '#C0C0C0',
      description: c.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.label.trim()) {
      setError('Kod (name) ve Kategori Adı (label) alanları zorunlu');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = isEdit
        ? await fetch('/api/categories', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi');

      setSuccess(isEdit ? 'Kategori güncellendi' : 'Yeni kategori eklendi');
      setDialogOpen(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (name === 'GARDEN') {
      alert('Bahçe (GARDEN) kategorisi silinemez.');
      return;
    }
    if (!confirm(`${name} kategorisini silmek istediğinize emin misiniz?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/categories?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Silinemedi');

      setSuccess('Kategori başarıyla silindi');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Kategori Yönetimi</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Masa ve salon kategorilerini düzenleyin, saatlik ücretlerini ve renklerini tanımlayın.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={load} disabled={loading || saving} title="Yenile">
            <Refresh />
          </IconButton>
          <Button variant="contained" startIcon={<Add />} onClick={openNew}>
            Yeni Kategori
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading && categories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell sx={{ fontWeight: 700 }}>Kod (Name)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Kategori Adı (Label)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Saatlik Ücret</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Renk</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Açıklama</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    <Chip label={c.name} size="small" sx={{ fontWeight: 800 }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{c.label}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {Number(c.hourly_rate).toFixed(2)} ₺ / saat
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: c.color,
                          border: '1px solid rgba(0,0,0,0.1)',
                          boxShadow: `0 0 8px ${c.color}66`,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {c.color}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{c.description || '—'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <IconButton onClick={() => openEdit(c)} size="small" color="primary">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(c.name)}
                        size="small"
                        color="error"
                        disabled={c.name === 'GARDEN'}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{isEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Kod (Örn: ELITE, GOLD)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
              disabled={isEdit}
              fullWidth
              helperText="Sadece büyük harf ve rakam girin. Bir kere kaydedildikten sonra değiştirilemez."
            />
            <TextField
              label="Kategori Adı (Örn: Gold Gaming)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              fullWidth
            />
            <TextField
              label="Saatlik Ücret (₺)"
              type="number"
              value={form.hourly_rate}
              onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Kategori Rengi (Hex)"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              fullWidth
              placeholder="#FFFFFF"
              slotProps={{
                input: {
                  startAdornment: (
                    <Box
                      component="span"
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: form.color || '#C0C0C0',
                        display: 'inline-block',
                        mr: 1,
                        border: '1px solid rgba(0,0,0,0.1)',
                        boxShadow: `0 0 6px ${form.color}44`,
                      }}
                    />
                  ),
                },
              }}
            />
            <TextField
              label="Açıklama"
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
