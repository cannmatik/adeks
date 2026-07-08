'use client';

import { useEffect, useState } from 'react';
import { Box, Stack, TextField, FormControlLabel, Switch, Autocomplete } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit, Delete } from '@mui/icons-material';
import { AdminCrudPage } from '@/components/admin/AdminCrudPage';

interface MenuRow {
  id: string;
  code: string | null;
  name: string;
  category: string;
  price: number;
  is_active: boolean;
  description: string | null;
}

interface FormState {
  code: string;
  name: string;
  category: string;
  price: number;
  is_active: boolean;
  description: string;
}

const emptyForm: FormState = {
  code: '',
  name: '',
  category: '',
  price: 0,
  is_active: true,
  description: '',
};

export default function AdminMenuPage() {
  const [rows, setRows] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/menu');
      if (!res.ok) throw new Error('Menü yüklenemedi');
      const data = await res.json();
      setRows(data.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openNew = () => {
    setIsEdit(false);
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: MenuRow) => {
    setIsEdit(true);
    setEditId(row.id);
    setForm({
      code: row.code || '',
      name: row.name,
      category: row.category,
      price: row.price,
      is_active: row.is_active,
      description: row.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Silme başarısız');
      setRows(rows.filter((r) => r.id !== id));
      setSuccess('Ürün silindi!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.category || form.price === undefined) {
      setError('İsim, kategori ve fiyat alanları zorunludur.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const url = isEdit ? `/api/menu/${editId}` : '/api/menu';
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        ...form,
        code: form.code || null,
        description: form.description || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Kaydetme başarısız');
      }
      
      const savedItem = await res.json();
      
      if (isEdit) {
        setRows(rows.map((row) => (row.id === editId ? savedItem : row)));
        setSuccess('Ürün başarıyla güncellendi!');
      } else {
        setRows([savedItem, ...rows]);
        setSuccess('Yeni ürün eklendi!');
      }
      
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'Ürün Kodu', width: 120 },
    { field: 'name', headerName: 'Ürün İsmi', width: 200 },
    { field: 'category', headerName: 'Kategori', width: 150 },
    { 
      field: 'price', 
      headerName: 'Fiyat (TL)', 
      type: 'number', 
      width: 120,
      renderCell: (params) => `${params.value} ₺`
    },
    { field: 'description', headerName: 'Açıklama', flex: 1, minWidth: 200 },
    { 
      field: 'is_active', 
      headerName: 'Durum', 
      width: 100,
      renderCell: (params) => (
        <Box sx={{ 
          color: params.value ? 'success.main' : 'error.main',
          fontWeight: 'bold'
        }}>
          {params.value ? 'Aktif' : 'Pasif'}
        </Box>
      )
    },
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
          onClick={() => handleDelete(params.row.id)}
        />,
      ],
    },
  ];

  const uniqueCategories = Array.from(new Set(rows.map(r => r.category))).filter(Boolean).sort();

  return (
    <AdminCrudPage
      title="Menü Yönetimi"
      description="Kafedeki tüm ürünleri, fiyatlarını ve kategorilerini düzenleyin."
      primaryActionLabel="Yeni Ürün"
      onPrimaryAction={openNew}
      error={error}
      success={success}
      onErrorClose={() => setError('')}
      onSuccessClose={() => setSuccess('')}
      loading={loading}
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      dialogOpen={dialogOpen}
      onDialogClose={() => setDialogOpen(false)}
      dialogTitle={isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
      saving={saving}
      onSave={handleSave}
      renderForm={
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Ürün Kodu"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            fullWidth
            placeholder="Örn: COKE01"
          />
          <TextField
            label="Ürün İsmi *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
            placeholder="Örn: Coca Cola Şişe"
          />
          <Autocomplete
            freeSolo
            options={uniqueCategories}
            value={form.category}
            onChange={(e, newValue) => setForm({ ...form, category: newValue || '' })}
            onInputChange={(e, newValue) => setForm({ ...form, category: newValue })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Kategori *"
                required
                placeholder="Örn: Soğuk İçecekler"
              />
            )}
            fullWidth
          />
          <TextField
            label="Fiyat (TL) *"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            fullWidth
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Açıklama"
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                color="primary"
              />
            }
            label="Satışa Açık (Aktif)"
          />
        </Stack>
      }
    />
  );
}
