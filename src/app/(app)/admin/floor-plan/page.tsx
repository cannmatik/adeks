'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import EditableRoomLayout from '@/components/tables/EditableRoomLayout';
import { CafeTable } from '@/components/tables/TableCard';
import { CATEGORY_META, STATUS_LABEL, TableCategory, TableStatus } from '@/lib/categories';

const categories: TableCategory[] = ['SILVER', 'GOLD', 'PLATINUM', 'PLATINUM_PLUS', 'ELITE', 'STREAM_RENDER', 'GARDEN'];
const statuses: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

export default function AdminFloorPlanPage() {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [editTable, setEditTable] = useState<CafeTable | null>(null);
  const [editNumber, setEditNumber] = useState(0);
  const [editCategory, setEditCategory] = useState<TableCategory>('SILVER');
  const [editStatus, setEditStatus] = useState<TableStatus>('AVAILABLE');
  const [editRoomId, setEditRoomId] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [addRoomId, setAddRoomId] = useState('');
  const [addX, setAddX] = useState(0);
  const [addY, setAddY] = useState(0);
  const [addNumber, setAddNumber] = useState(0);
  const [addCategory, setAddCategory] = useState<TableCategory>('SILVER');
  const [addStatus, setAddStatus] = useState<TableStatus>('AVAILABLE');

  const load = async () => {
    setLoading(true);
    try {
      const [tablesRes, roomsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/rooms'),
      ]);
      const tablesData = await tablesRes.json();
      const roomsData = await roomsRes.json();
      if (tablesRes.ok) setTables(tablesData.tables);
      else setError(tablesData.error);
      if (roomsRes.ok) setRooms(roomsData.rooms || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMove = async (id: string, roomId: string, x: number, y: number) => {
    const res = await fetch('/api/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, room_id: roomId, position_x: x, position_y: y }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Konum güncellenemedi');
      load(); // revert
    } else {
      setSuccess('Konum güncellendi');
      setTimeout(() => setSuccess(''), 2000);
      load();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSuccess('Masa silindi');
      load();
      setTimeout(() => setSuccess(''), 2000);
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const openEdit = (t: CafeTable) => {
    setEditTable(t);
    setEditNumber(t.number);
    setEditCategory(t.category);
    setEditStatus(t.status);
    setEditRoomId(t.room?.id || '');
    setEditNotes(t.notes ?? '');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTable) return;
    const res = await fetch('/api/tables', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editTable.id,
        number: editNumber,
        category: editCategory,
        status: editStatus,
        room_id: editRoomId || null,
        notes: editNotes || null,
      }),
    });
    if (res.ok) {
      setEditOpen(false);
      setSuccess('Masa güncellendi');
      load();
      setTimeout(() => setSuccess(''), 2000);
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const openAdd = (roomId: string, x: number, y: number) => {
    const nextNumber = (tables.reduce((max, t) => Math.max(max, t.number), 0) || 0) + 1;
    setAddRoomId(roomId);
    setAddX(x);
    setAddY(y);
    setAddNumber(nextNumber);
    setAddCategory('SILVER');
    setAddStatus('AVAILABLE');
    setAddOpen(true);
  };

  const handleAddSave = async () => {
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: addNumber,
        category: addCategory,
        status: addStatus,
        room_id: addRoomId,
        position_x: addX,
        position_y: addY,
      }),
    });
    if (res.ok) {
      setAddOpen(false);
      setSuccess('Masa eklendi');
      load();
      setTimeout(() => setSuccess(''), 2000);
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Salon Düzeni</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Masaları sürükle-bırak ile taşı, boş alana tıklayarak yeni masa ekle.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={load} disabled={loading}>
          {loading ? 'Yükleniyor...' : 'Yenile'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <EditableRoomLayout
          tables={tables}
          onTableMove={handleMove}
          onTableDelete={handleDelete}
          onTableEdit={openEdit}
          onTableAdd={openAdd}
        />
      )}

      {/* Edit Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Masayı Düzenle #{editTable?.number}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Numara"
              type="number"
              value={editNumber}
              onChange={(e) => setEditNumber(Number(e.target.value))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              select
              label="Kategori"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as TableCategory)}
              fullWidth
            >
              {categories.map((c) => (
                <MenuItem key={c} value={c}>{CATEGORY_META[c].label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Durum"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as TableStatus)}
              fullWidth
            >
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Bölüm (Oda)"
              value={editRoomId}
              onChange={(e) => setEditRoomId(e.target.value)}
              fullWidth
            >
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Not"
              multiline
              minRows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Yeni Masa Ekle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Numara"
              type="number"
              value={addNumber}
              onChange={(e) => setAddNumber(Number(e.target.value))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              select
              label="Kategori"
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value as TableCategory)}
              fullWidth
            >
              {categories.map((c) => (
                <MenuItem key={c} value={c}>{CATEGORY_META[c].label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Durum"
              value={addStatus}
              onChange={(e) => setAddStatus(e.target.value as TableStatus)}
              fullWidth
            >
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1}>
              <Chip label={`X: ${addX}`} variant="outlined" size="small" />
              <Chip label={`Y: ${addY}`} variant="outlined" size="small" />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleAddSave} startIcon={<Save />}>
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
