'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Edit, Delete, Map, Add } from '@mui/icons-material';
import { CafeTable, RoomLite } from '@/components/tables/TableCard';
import CategoryBadge from '@/components/tables/CategoryBadge';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  TableCategory,
  TableStatus,
} from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';
import { AdminCrudPage } from '@/components/admin/AdminCrudPage';

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
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
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
    setSuccess('');
    try {
      const body = { ...form };
      const res = form.id
        ? await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi');
      
      setSuccess(form.id ? 'Masa güncellendi' : 'Yeni masa eklendi');
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
    if (!confirm('Bu masayı silmek istediğine emin misin?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi');
      setSuccess('Masa başarıyla silindi');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'number', headerName: 'No', width: 80, renderCell: (params) => (
      <Typography variant="h6" sx={{ color: categoryMeta[params.row.category]?.color ?? '#C0C0C0' }}>
        #{params.value}
      </Typography>
    )},
    { field: 'room', headerName: 'Bölüm', width: 150, renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
        {params.row.room?.name || '—'}
      </Typography>
    )},
    { field: 'category', headerName: 'Kategori', width: 150, renderCell: (params) => (
      <CategoryBadge category={params.value as TableCategory} />
    )},
    { field: 'status', headerName: 'Durum', width: 150, renderCell: (params) => (
      <Chip
        size="small"
        label={STATUS_LABEL[params.value as TableStatus]}
        color={STATUS_COLOR[params.value as TableStatus]}
        variant="outlined"
      />
    )},
    { field: 'shape', headerName: 'Şekil', width: 120, renderCell: (params) => (
      <Chip
        size="small"
        label={params.value === 'ROUND' ? 'Yuvarlak' : 'Kare'}
        variant="outlined"
        sx={{ opacity: 0.8 }}
      />
    )},
    { field: 'rate', headerName: 'Ücret', width: 120, renderCell: (params) => (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {categoryMeta[params.row.category]?.defaultRate ?? 0} ₺/saat
      </Typography>
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
          onClick={() => openEdit(params.row as CafeTable)}
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
      title="Masa Yönetimi"
      description="Yeni masa ekle, düzenle veya kaldır."
      primaryActionLabel="Yeni Masa"
      primaryActionIcon={<Add />}
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
      rows={tables}
      columns={columns}
      getRowId={(row) => row.id}
      dialogOpen={dialogOpen}
      onDialogClose={() => setDialogOpen(false)}
      dialogTitle={form.id ? 'Masayı Düzenle' : 'Yeni Masa'}
      saving={saving}
      onSave={handleSave}
      renderForm={
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
      }
    />
  );
}
