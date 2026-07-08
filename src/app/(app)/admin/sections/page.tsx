'use client';

import { useEffect, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField, Typography, Chip } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit, Delete, Map, MeetingRoom } from '@mui/icons-material';
import { RoomLite } from '@/components/tables/TableCard';
import { TableCategory } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';
import { AdminCrudPage } from '@/components/admin/AdminCrudPage';

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
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
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
    setSuccess('');
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
      
      setSuccess(form.id ? 'Bölüm güncellendi' : 'Yeni bölüm eklendi');
      setDialogOpen(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu bölümü silmek istediğine emin misin? İçindeki masalar da silinecek.')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi');
      setSuccess('Bölüm başarıyla silindi');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Bölüm Adı', flex: 1, minWidth: 150, renderCell: (params) => (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: params.row.color || '#7E7E85',
            flexShrink: 0,
            border: '2px solid',
            borderColor: params.row.color ? `${params.row.color}60` : 'rgba(0,0,0,0.1)',
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{params.value}</Typography>
      </Stack>
    )},
    { field: 'floor', headerName: 'Kat', width: 100, renderCell: (params) => (
      <Chip size="small" label={`${params.value ?? '1'}. Kat`} variant="outlined" />
    )},
    { field: 'category', headerName: 'Kategori', width: 150, renderCell: (params) => {
      const catLabel = params.value ? (categoryMeta[params.value as string]?.label ?? params.value) : null;
      if (!catLabel) return null;
      return (
        <Chip
          size="small"
          label={catLabel}
          sx={{
            bgcolor: `${categoryMeta[params.value as string]?.color ?? '#7E7E85'}20`,
            color: categoryMeta[params.value as string]?.color ?? '#7E7E85',
            fontWeight: 600,
          }}
        />
      );
    }},
    { field: 'size', headerName: 'Boyut', width: 120, renderCell: (params) => (
      <Chip size="small" label={`${params.row.col_span ?? 1}×${params.row.row_span ?? 1}`} variant="outlined" sx={{ opacity: 0.8 }} />
    )},
    { field: 'coordinates', headerName: 'Koordinat', flex: 1, minWidth: 150, renderCell: (params) => {
      const x1 = params.row.floor_col ?? 0;
      const y1 = params.row.floor_row ?? 0;
      const x2 = x1 + (params.row.col_span ?? 1);
      const y2 = y1 + (params.row.row_span ?? 1);
      return <Typography variant="body2" sx={{ color: 'text.secondary' }}>({x1},{y1}) → ({x2},{y2})</Typography>;
    }},
    { field: 'display_order', headerName: 'Sıra', width: 80, align: 'center', headerAlign: 'center' },
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

  return (
    <AdminCrudPage
      title="Bölüm Yönetimi"
      description="Bölümleri ekle, düzenle, koordinatlarını ayarla veya kaldır."
      primaryActionLabel="Yeni Bölüm"
      primaryActionIcon={<MeetingRoom />}
      onPrimaryAction={openNew}
      extraActions={
        <Button variant="outlined" startIcon={<Map />} href="/admin/floor-plan" component="a">
          Salon Düzeni
        </Button>
      }
      error={error}
      success={success}
      onErrorClose={() => setError('')}
      onSuccessClose={() => setSuccess('')}
      loading={loading}
      rows={rooms}
      columns={columns}
      getRowId={(row) => row.id}
      dialogOpen={dialogOpen}
      onDialogClose={() => setDialogOpen(false)}
      dialogTitle={form.id ? 'Bölümü Düzenle' : 'Yeni Bölüm'}
      saving={saving}
      onSave={handleSave}
      renderForm={
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
      }
    />
  );
}
