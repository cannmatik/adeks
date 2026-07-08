'use client';

import { useEffect, useState } from 'react';
import { Box, Stack, TextField } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit, Delete, Refresh } from '@mui/icons-material';
import { useCategories } from '@/components/CategoryProvider';
import { AdminCrudPage } from '@/components/admin/AdminCrudPage';

interface FormState {
  name: string;
  label: string;
  hourly_rate: number;
  color: string;
  description: string;
  featuresText: string;
}

const emptyForm: FormState = {
  name: '',
  label: '',
  hourly_rate: 0,
  color: '#C0C0C0',
  description: '',
  featuresText: '',
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
      featuresText: Array.isArray(c.features) ? c.features.join('\n') : '',
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
      const payload = {
        ...form,
        features: form.featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
      };

      const res = isEdit
        ? await fetch('/api/categories', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Kod (Name)', width: 120, headerAlign: 'left', align: 'left', renderCell: (params) => (
      <Box sx={{ fontWeight: 800 }}>{params.value}</Box>
    )},
    { field: 'label', headerName: 'Kategori Adı (Label)', flex: 1, minWidth: 200, renderCell: (params) => (
      <Box sx={{ fontWeight: 600 }}>{params.value}</Box>
    )},
    { field: 'hourly_rate', headerName: 'Saatlik Ücret', width: 150, renderCell: (params) => (
      <Box sx={{ fontWeight: 700, color: 'primary.main' }}>
        {Number(params.value).toFixed(2)} ₺ / saat
      </Box>
    )},
    { field: 'color', headerName: 'Renk', width: 150, renderCell: (params) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
        <Box
          sx={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            bgcolor: params.value,
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: `0 0 8px ${params.value}66`,
          }}
        />
        <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          {params.value}
        </Box>
      </Stack>
    )},
    { field: 'description', headerName: 'Açıklama', flex: 1.5, minWidth: 250, renderCell: (params) => (
      <Box sx={{ color: 'text.secondary' }}>{params.value || '—'}</Box>
    )},
    {
      field: 'actions',
      type: 'actions',
      headerName: 'İşlemler',
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="Düzenle"
          onClick={() => openEdit(params.row)}
          color="primary"
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete color="error" />}
          label="Sil"
          onClick={() => handleDelete(params.row.name)}
        />,
      ],
    },
  ];

  return (
    <AdminCrudPage
      title="Kategori Yönetimi"
      description="Masa ve salon kategorilerini düzenleyin, saatlik ücretlerini ve renklerini tanımlayın."
      primaryActionLabel="Yeni Kategori"
      onPrimaryAction={openNew}
      error={error}
      success={success}
      onErrorClose={() => setError('')}
      onSuccessClose={() => setSuccess('')}
      loading={loading || (categories.length === 0 && !error && !success)}
      rows={categories}
      columns={columns}
      getRowId={(row) => row.name}
      dialogOpen={dialogOpen}
      onDialogClose={() => setDialogOpen(false)}
      dialogTitle={isEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
      saving={saving}
      onSave={handleSave}
      renderForm={
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
          <TextField
            label="Özellikler (Her satıra bir özellik)"
            multiline
            minRows={4}
            value={form.featuresText}
            onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
            fullWidth
            placeholder="İşlemci: Intel Core i7&#10;GPU: RTX 3080&#10;RAM: 32GB"
            helperText="Bu özellikler Dashboard'da kategori ücretleri altında maddeler halinde (accordion) gösterilir."
          />
        </Stack>
      }
    />
  );
}
