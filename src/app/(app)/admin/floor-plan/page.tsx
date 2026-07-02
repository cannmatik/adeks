'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Badge,
  Button,
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
import { Save, Add, Delete } from '@mui/icons-material';
import EditableRoomLayout from '@/components/tables/EditableRoomLayout';
import { CafeTable, RoomLite } from '@/components/tables/TableCard';
import { STATUS_LABEL, TableCategory, TableStatus } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';

const statuses: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

export default function AdminFloorPlanPage() {
  const { categories: dbCategories, categoryMeta } = useCategories();
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [originalTables, setOriginalTables] = useState<CafeTable[]>([]);
  const [originalRooms, setOriginalRooms] = useState<RoomLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Table modal states
  const [editOpen, setEditOpen] = useState(false);
  const [editTable, setEditTable] = useState<CafeTable | null>(null);
  const [editNumber, setEditNumber] = useState(0);
  const [editCategory, setEditCategory] = useState<TableCategory>('SILVER');
  const [editStatus, setEditStatus] = useState<TableStatus>('AVAILABLE');
  const [editRoomId, setEditRoomId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editShape, setEditShape] = useState<string>('SQUARE');

  const [addOpen, setAddOpen] = useState(false);
  const [addRoomId, setAddRoomId] = useState('');
  const [addX, setAddX] = useState(0);
  const [addY, setAddY] = useState(0);
  const [addNumber, setAddNumber] = useState(0);
  const [addCategory, setAddCategory] = useState<TableCategory>('SILVER');
  const [addStatus, setAddStatus] = useState<TableStatus>('AVAILABLE');
  const [addShape, setAddShape] = useState<string>('SQUARE');

  // Room modal states
  const [roomAddOpen, setRoomAddOpen] = useState(false);
  const [roomEditOpen, setRoomEditOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomLite | null>(null);
  const [placingRoom, setPlacingRoom] = useState<{ floor: string; colSpan: number; rowSpan: number } | null>(null);

  // Room form fields
  const [roomName, setRoomName] = useState('');
  const [roomFloor, setRoomFloor] = useState('1');
  const [roomColor, setRoomColor] = useState('#7E7E85');
  const [roomSize, setRoomSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const [roomCategory, setRoomCategory] = useState<TableCategory | ''>('');

  const sizePresets = {
    small:  { label: 'Küçük (6×4)',  cols: 6,  rows: 4 },
    medium: { label: 'Orta (8×5)',   cols: 8,  rows: 5 },
    large:  { label: 'Büyük (10×6)', cols: 10, rows: 6 },
    xlarge: { label: 'Çok Büyük (12×8)', cols: 12, rows: 8 },
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [tablesRes, roomsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/rooms'),
      ]);
      const tablesData = await tablesRes.json();
      const roomsData = await roomsRes.json();
      if (tablesRes.ok && roomsRes.ok) {
        const rawTables = tablesData.tables || [];
        const rawRooms = roomsData.rooms || [];
        
        setTables(rawTables);
        setOriginalTables(JSON.parse(JSON.stringify(rawTables)));
        
        setRooms(rawRooms);
        setOriginalRooms(JSON.parse(JSON.stringify(rawRooms)));
      } else {
        if (!tablesRes.ok) setError(tablesData.error);
        if (!roomsRes.ok) setError(roomsData.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Diff helpers
  function tableChanged(orig: CafeTable, curr: CafeTable): boolean {
    return (
      orig.number !== curr.number ||
      orig.category !== curr.category ||
      orig.status !== curr.status ||
      orig.position_x !== curr.position_x ||
      orig.position_y !== curr.position_y ||
      (orig.notes ?? '') !== (curr.notes ?? '') ||
      (orig.room?.id ?? '') !== (curr.room?.id ?? '') ||
      orig.shape !== curr.shape
    );
  }

  function roomChanged(orig: RoomLite, curr: RoomLite): boolean {
    return (
      orig.name !== curr.name ||
      (orig.floor ?? '') !== (curr.floor ?? '') ||
      (orig.color ?? '') !== (curr.color ?? '') ||
      (orig.col_span ?? 0) !== (curr.col_span ?? 0) ||
      (orig.row_span ?? 0) !== (curr.row_span ?? 0) ||
      (orig.category ?? '') !== (curr.category ?? '') ||
      (orig.floor_col ?? 0) !== (curr.floor_col ?? 0) ||
      (orig.floor_row ?? 0) !== (curr.floor_row ?? 0)
    );
  }

  const { hasChanges, changeCount } = useMemo(() => {
    const origTableMap = new Map(originalTables.map((t) => [t.id, t]));
    const currTableMap = new Map(tables.map((t) => [t.id, t]));
    const origRoomMap = new Map(originalRooms.map((r) => [r.id, r]));
    const currRoomMap = new Map(rooms.map((r) => [r.id, r]));

    let count = 0;
    for (const t of tables) {
      const orig = origTableMap.get(t.id);
      if (!orig) count++;
      else if (tableChanged(orig, t)) count++;
    }
    for (const t of originalTables) {
      if (!currTableMap.has(t.id)) count++;
    }
    for (const r of rooms) {
      const orig = origRoomMap.get(r.id);
      if (!orig) count++;
      else if (roomChanged(orig, r)) count++;
    }
    for (const r of originalRooms) {
      if (!currRoomMap.has(r.id)) count++;
    }
    return { hasChanges: count > 0, changeCount: count };
  }, [tables, rooms, originalTables, originalRooms]);

  const handleMove = (id: string, roomId: string, x: number, y: number) => {
    // Check if another table already occupies this position in the same room
    const conflicting = tables.find(
      (t) => t.id !== id && t.room?.id === roomId && t.position_x === x && t.position_y === y
    );
    if (conflicting) return; // Üst üste bırakma engelle

    setTables((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, position_x: x, position_y: y, room: rooms.find((r) => r.id === roomId) || t.room }
          : t
      )
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm('Bu masa silinsin mi?')) return;
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  const openEdit = (t: CafeTable) => {
    setEditTable(t);
    setEditNumber(t.number);
    setEditCategory(t.category);
    setEditStatus(t.status);
    setEditRoomId(t.room?.id || '');
    setEditNotes(t.notes ?? '');
    setEditShape(t.shape ?? 'SQUARE');
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editTable) return;
    setEditOpen(false);
    const newRoom = rooms.find((r) => r.id === editRoomId) || null;
    setTables((prev) =>
      prev.map((t) =>
        t.id === editTable.id
          ? {
              ...t,
              number: editNumber,
              category: editCategory,
              status: editStatus,
              room: newRoom,
              notes: editNotes || null,
              shape: editShape,
            }
          : t
      )
    );
  };

  const openAdd = (roomId: string, x: number, y: number) => {
    const nextNumber = (tables.reduce((max, t) => Math.max(max, t.number), 0) || 0) + 1;
    const room = rooms.find(r => r.id === roomId);
    setAddRoomId(roomId);
    setAddX(x);
    setAddY(y);
    setAddNumber(nextNumber);
    setAddCategory(room?.category || 'SILVER');
    setAddStatus('AVAILABLE');
    setAddShape(room?.name === '1.KAT Üst' ? 'ROUND' : 'SQUARE');
    setAddOpen(true);
  };

  const handleAddSave = () => {
    setAddOpen(false);
    const room = rooms.find((r) => r.id === addRoomId) || null;
    const newTable: CafeTable = {
      id: crypto.randomUUID(),
      number: addNumber,
      category: addCategory,
      status: addStatus,
      hourly_rate: categoryMeta[addCategory]?.defaultRate ?? 0,
      position_x: addX,
      position_y: addY,
      notes: null,
      room,
      shape: addShape,
    };
    setTables((prev) => [...prev, newTable]);
  };

  const resetRoomForm = () => {
    setRoomName('');
    setRoomFloor('1');
    setRoomColor('#7E7E85');
    setRoomSize('medium');
    setRoomCategory('');
  };

  const openRoomAdd = () => {
    resetRoomForm();
    setRoomAddOpen(true);
  };

  const openRoomEdit = (room: RoomLite) => {
    setEditRoom(room);
    setRoomName(room.name);
    setRoomFloor(room.floor ?? '1');
    setRoomColor(room.color ?? '#7E7E85');
    setRoomCategory(room.category ?? '');
    setRoomEditOpen(true);
  };

  const handleRoomAddSave = () => {
    if (!roomName.trim()) {
      setError('Bölüm adı zorunlu');
      return;
    }
    const preset = sizePresets[roomSize];
    const newRoom: RoomLite = {
      id: crypto.randomUUID(),
      name: roomName.trim(),
      floor: roomFloor,
      color: roomColor,
      col_span: preset.cols,
      row_span: preset.rows,
      display_order: rooms.length,
      category: roomCategory || null,
      floor_col: 0,
      floor_row: 0,
    };
    setRooms((prev) => [...prev, newRoom]);
    setRoomAddOpen(false);
    resetRoomForm();
  };

  const handleRoomEditSave = () => {
    if (!editRoom) return;
    if (!roomName.trim()) {
      setError('Bölüm adı zorunlu');
      return;
    }
    setRoomEditOpen(false);
    const updatedRoom: RoomLite = {
      ...editRoom,
      name: roomName.trim(),
      floor: roomFloor,
      color: roomColor,
      category: roomCategory || null,
    };
    setRooms((prev) => prev.map((r) => (r.id === editRoom.id ? updatedRoom : r)));
    setTables((prev) => prev.map((t) => (t.room?.id === editRoom.id ? { ...t, room: updatedRoom, category: updatedRoom.category || t.category } : t)));
  };

  const handleRoomMove = (roomId: string, floorCol: number, floorRow: number) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, floor_col: floorCol, floor_row: floorRow } : r))
    );
    setTables((prev) =>
      prev.map((t) =>
        t.room?.id === roomId
          ? { ...t, room: { ...t.room, floor_col: floorCol, floor_row: floorRow } }
          : t
      )
    );
  };

  const handleRoomResize = (roomId: string, colSpan: number, rowSpan: number) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, col_span: colSpan, row_span: rowSpan } : r))
    );
    // Also update the room object inside each table so EditableRoomLayout re-renders
    setTables((prev) =>
      prev.map((t) =>
        t.room?.id === roomId
          ? { ...t, room: { ...t.room, col_span: colSpan, row_span: rowSpan } }
          : t
      )
    );
  };

  const handleRoomDelete = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!confirm(`${room?.name ?? 'Bu bölüm'} silinsin mi? Bu işlem geri alınamaz.`)) return;
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setTables((prev) => prev.filter((t) => t.room?.id !== roomId));
  };

  const handleRoomQuickAdd = (floor: string) => {
    setPlacingRoom({ floor, colSpan: 2, rowSpan: 2 });
  };

  const handleRoomPlace = (floor: string, col: number, row: number) => {
    const newRoom: RoomLite = {
      id: crypto.randomUUID(),
      name: 'Yeni Bölüm',
      floor,
      color: '#7E7E85',
      col_span: 2,
      row_span: 2,
      display_order: rooms.length,
      category: null,
      floor_col: col,
      floor_row: row,
    };
    setRooms((prev) => [...prev, newRoom]);
    setPlacingRoom(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlacingRoom(null);
      }
    };
    if (placingRoom) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [placingRoom]);

  // Save all changes
  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    const origTableMap = new Map(originalTables.map((t) => [t.id, t]));
    const currTableMap = new Map(tables.map((t) => [t.id, t]));
    const origRoomMap = new Map(originalRooms.map((r) => [r.id, r]));
    const currRoomMap = new Map(rooms.map((r) => [r.id, r]));

    const tableCreates = tables.filter((t) => !origTableMap.has(t.id));
    const tableUpdates = tables.filter((t) => {
      const orig = origTableMap.get(t.id);
      return orig && tableChanged(orig, t);
    });
    const tableDeletes = originalTables.filter((t) => !currTableMap.has(t.id));

    const roomCreates = rooms.filter((r) => !origRoomMap.has(r.id));
    const roomUpdates = rooms.filter((r) => {
      const orig = origRoomMap.get(r.id);
      return orig && roomChanged(orig, r);
    });
    const roomDeletes = originalRooms.filter((r) => !currRoomMap.has(r.id));

    let anyError = '';
    
    // We will build the final states locally to avoid React async state update closure bugs
    let finalRooms = JSON.parse(JSON.stringify(rooms)) as RoomLite[];
    let finalTables = JSON.parse(JSON.stringify(tables)) as CafeTable[];

    try {
      // 1. Create rooms first to get their real IDs
      for (const r of roomCreates) {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: r.name,
            floor: r.floor,
            color: r.color,
            col_span: r.col_span,
            row_span: r.row_span,
            display_order: r.display_order,
            category: r.category,
            floor_col: r.floor_col,
            floor_row: r.floor_row,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          anyError = data.error || 'Bölüm eklenemedi';
          break;
        }

        const realRoomId = data.room.id;
        const tempRoomId = r.id;

        // Replace room ID in finalRooms
        finalRooms = finalRooms.map(item => item.id === tempRoomId ? { ...item, id: realRoomId } : item);

        // Replace room object and room_id in finalTables
        finalTables = finalTables.map(item => 
          item.room?.id === tempRoomId 
            ? { ...item, room: { ...item.room, id: realRoomId } } 
            : item
        );
      }

      if (!anyError) {
        // 2. Create tables using the updated real room IDs
        const updatedTableCreates = finalTables.filter(t => !origTableMap.has(t.id));

        for (const t of updatedTableCreates) {
          const res = await fetch('/api/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              number: t.number,
              category: t.category,
              status: t.status,
              room_id: t.room?.id || null, // This is now the real room ID!
              position_x: t.position_x,
              position_y: t.position_y,
              notes: t.notes,
              shape: t.shape ?? 'SQUARE',
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            anyError = data.error || 'Masa eklenemedi';
            break;
          }

          const realTableId = data.table.id;
          const tempTableId = t.id;

          // Replace table ID in finalTables
          finalTables = finalTables.map(item => item.id === tempTableId ? { ...item, id: realTableId } : item);
        }
      }

      if (!anyError) {
        // 3. Update tables
        for (const t of tableUpdates) {
          const res = await fetch('/api/tables', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: t.id,
              number: t.number,
              category: t.category,
              status: t.status,
              room_id: t.room?.id || null,
              position_x: t.position_x,
              position_y: t.position_y,
              notes: t.notes,
              shape: t.shape ?? 'SQUARE',
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            anyError = data.error || 'Masa güncellenemedi';
            break;
          }
        }
      }

      if (!anyError) {
        // 4. Delete tables
        for (const t of tableDeletes) {
          const res = await fetch(`/api/tables?id=${t.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            anyError = data.error || 'Masa silinemedi';
            break;
          }
          finalTables = finalTables.filter((item) => item.id !== t.id);
        }
      }

      if (!anyError) {
        // 5. Update rooms
        for (const r of roomUpdates) {
          const res = await fetch('/api/rooms', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: r.id,
              name: r.name,
              floor: r.floor,
              color: r.color,
              col_span: r.col_span,
              row_span: r.row_span,
              category: r.category,
              floor_col: r.floor_col,
              floor_row: r.floor_row,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            anyError = data.error || 'Bölüm güncellenemedi';
            break;
          }
        }
      }

      if (!anyError) {
        // 6. Delete rooms
        for (const r of roomDeletes) {
          const res = await fetch(`/api/rooms?id=${r.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            anyError = data.error || 'Bölüm silinemedi';
            break;
          }
          finalRooms = finalRooms.filter((item) => item.id !== r.id);
        }
      }

      if (anyError) {
        setError(anyError);
      } else {
        setSuccess('Tüm değişiklikler kaydedildi');
        setTimeout(() => setSuccess(''), 3000);
        
        // Update states and originals synchronously using the constructed final arrays
        setTables(finalTables);
        setRooms(finalRooms);
        setOriginalTables(JSON.parse(JSON.stringify(finalTables)));
        setOriginalRooms(JSON.parse(JSON.stringify(finalRooms)));
      }
    } catch (err: any) {
      setError(err.message || 'Kaydetme sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Salon Düzeni</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Masaları sürükle-bırak ile taşı, boş alana tıklayarak yeni masa ekle. Değişiklikleri Kaydet butonu ile sunucuya gönder.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={load} disabled={loading || saving}>
            {loading ? 'Yükleniyor...' : 'Yenile'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openRoomAdd} disabled={loading || saving}>
            Yeni Bölüm
          </Button>
          <Badge badgeContent={changeCount} color="error" invisible={!hasChanges}>
            <Button
              variant="contained"
              color="success"
              startIcon={<Save />}
              onClick={handleSaveAll}
              disabled={!hasChanges || saving}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
            </Button>
          </Badge>
        </Stack>
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

      {placingRoom && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setPlacingRoom(null)}>
          Bölümü yerleştirmek istediğiniz konuma tıklayın. İptal etmek için <strong>ESC</strong> tuşuna basabilir veya bu uyarıyı kapatabilirsiniz.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <EditableRoomLayout
          rooms={rooms}
          tables={tables}
          onTableMove={handleMove}
          onTableDelete={handleDelete}
          onTableEdit={openEdit}
          onTableAdd={openAdd}
          onRoomEdit={openRoomEdit}
          onRoomDelete={handleRoomDelete}
          onRoomResize={handleRoomResize}
          onRoomMove={handleRoomMove}
          onRoomQuickAdd={handleRoomQuickAdd}
          placingRoom={placingRoom}
          onRoomPlace={handleRoomPlace}
        />
      )}

      {/* Edit Table Modal */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Masayı Düzenle #{editTable?.number}</span>
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (editTable) {
                  handleDelete(editTable.id);
                  setEditOpen(false);
                }
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
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
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
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
              label="Şekil"
              value={editShape}
              onChange={(e) => setEditShape(e.target.value)}
              fullWidth
            >
              <MenuItem value="SQUARE">Kare</MenuItem>
              <MenuItem value="ROUND">Yuvarlak</MenuItem>
            </TextField>
            <TextField
              select
              label="Bölüm (Oda)"
              value={editRoomId}
              onChange={(e) => {
                const newRoomId = e.target.value;
                setEditRoomId(newRoomId);
                const newRoom = rooms.find(r => r.id === newRoomId);
                if (newRoom && newRoom.category) {
                  setEditCategory(newRoom.category);
                }
              }}
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
            Tamam
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Table Modal */}
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
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
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
            <TextField
              select
              label="Şekil"
              value={addShape}
              onChange={(e) => setAddShape(e.target.value)}
              fullWidth
            >
              <MenuItem value="SQUARE">Kare</MenuItem>
              <MenuItem value="ROUND">Yuvarlak</MenuItem>
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

      {/* Add Room Modal */}
      <Dialog open={roomAddOpen} onClose={() => setRoomAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Yeni Bölüm Ekle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Bölüm Adı"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              fullWidth
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Kat"
                value={roomFloor}
                onChange={(e) => setRoomFloor(e.target.value)}
                fullWidth
                placeholder="1, 2, Bahçe..."
              />
              <TextField
                label="Renk"
                value={roomColor}
                onChange={(e) => setRoomColor(e.target.value)}
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
                          bgcolor: roomColor || '#7E7E85',
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
            <TextField
              select
              label="Kategori (isteğe bağlı)"
              value={roomCategory}
              onChange={(e) => setRoomCategory(e.target.value as TableCategory | '')}
              fullWidth
            >
              <MenuItem value="">— Seçilmedi —</MenuItem>
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoomAddOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleRoomAddSave} startIcon={<Save />}>
            Ekle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Room Modal */}
      <Dialog open={roomEditOpen} onClose={() => setRoomEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Bölümü Düzenle</span>
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                if (editRoom) handleRoomDelete(editRoom.id);
                setRoomEditOpen(false);
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Bölüm Adı"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              fullWidth
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Kat"
                value={roomFloor}
                onChange={(e) => setRoomFloor(e.target.value)}
                fullWidth
                placeholder="1, 2, Bahçe..."
              />
              <TextField
                label="Renk"
                value={roomColor}
                onChange={(e) => setRoomColor(e.target.value)}
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
                          bgcolor: roomColor || '#7E7E85',
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
            <TextField
              select
              label="Kategori (isteğe bağlı)"
              value={roomCategory}
              onChange={(e) => setRoomCategory(e.target.value as TableCategory | '')}
              fullWidth
            >
              <MenuItem value="">— Seçilmedi —</MenuItem>
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRoomEditOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleRoomEditSave} startIcon={<Save />}>
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
