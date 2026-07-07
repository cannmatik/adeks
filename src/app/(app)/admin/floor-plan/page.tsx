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
import { Save, Add, Delete, Widgets } from '@mui/icons-material';
import EditableRoomLayout from '@/components/tables/EditableRoomLayout';
import { CafeTable, RoomLite } from '@/components/tables/TableCard';
import { STATUS_LABEL, TableCategory, TableStatus } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';
import { OBJECT_KINDS, FloorObjectItem, rectsOverlap } from '@/components/tables/objectMeta';

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

  // Floor object states
  const [objects, setObjects] = useState<FloorObjectItem[]>([]);
  const [originalObjects, setOriginalObjects] = useState<FloorObjectItem[]>([]);
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [objEditing, setObjEditing] = useState<FloorObjectItem | null>(null); // null = yeni ekleme
  const [objFloor, setObjFloor] = useState('');
  const [objKind, setObjKind] = useState('WC');
  const [objLabel, setObjLabel] = useState('');
  const [objWidth, setObjWidth] = useState(2);
  const [objHeight, setObjHeight] = useState(2);

  // Room form fields
  const [roomName, setRoomName] = useState('');
  const [roomShortCode, setRoomShortCode] = useState('');
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
      const [tablesRes, roomsRes, objectsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/rooms'),
        fetch('/api/floor-objects'),
      ]);
      const tablesData = await tablesRes.json();
      const roomsData = await roomsRes.json();
      const objectsData = await objectsRes.json();
      if (tablesRes.ok && roomsRes.ok && objectsRes.ok) {
        const rawTables = tablesData.tables || [];
        const rawRooms = roomsData.rooms || [];
        const rawObjects = objectsData.objects || [];

        setTables(rawTables);
        setOriginalTables(JSON.parse(JSON.stringify(rawTables)));

        setRooms(rawRooms);
        setOriginalRooms(JSON.parse(JSON.stringify(rawRooms)));

        setObjects(rawObjects);
        setOriginalObjects(JSON.parse(JSON.stringify(rawObjects)));
      } else {
        if (!tablesRes.ok) setError(tablesData.error);
        if (!roomsRes.ok) setError(roomsData.error);
        if (!objectsRes.ok) setError(objectsData.error);
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

  function objectChanged(orig: FloorObjectItem, curr: FloorObjectItem): boolean {
    return (
      orig.kind !== curr.kind ||
      (orig.label ?? '') !== (curr.label ?? '') ||
      orig.floor_col !== curr.floor_col ||
      orig.floor_row !== curr.floor_row ||
      orig.col_span !== curr.col_span ||
      orig.row_span !== curr.row_span ||
      orig.floor !== curr.floor
    );
  }

  const { hasChanges, changeCount } = useMemo(() => {
    const origTableMap = new Map(originalTables.map((t) => [t.id, t]));
    const currTableMap = new Map(tables.map((t) => [t.id, t]));
    const origRoomMap = new Map(originalRooms.map((r) => [r.id, r]));
    const currRoomMap = new Map(rooms.map((r) => [r.id, r]));
    const origObjMap = new Map(originalObjects.map((o) => [o.id, o]));
    const currObjMap = new Map(objects.map((o) => [o.id, o]));

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
    for (const o of objects) {
      const orig = origObjMap.get(o.id);
      if (!orig) count++;
      else if (objectChanged(orig, o)) count++;
    }
    for (const o of originalObjects) {
      if (!currObjMap.has(o.id)) count++;
    }
    return { hasChanges: count > 0, changeCount: count };
  }, [tables, rooms, objects, originalTables, originalRooms, originalObjects]);

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

  const handleFloorObjectMove = (id: string, floorCol: number, floorRow: number) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, floor_col: floorCol, floor_row: floorRow } : o)),
    );
  };

  const floors = useMemo(() => Array.from(new Set(rooms.map((r) => r.floor))).sort(), [rooms]);

  const openObjectAdd = (floor?: string) => {
    setObjEditing(null);
    setObjFloor(floor || floors[0] || '');
    setObjKind('WC');
    setObjLabel('');
    setObjWidth(2);
    setObjHeight(2);
    setObjDialogOpen(true);
  };

  const openObjectEdit = (obj: FloorObjectItem) => {
    setObjEditing(obj);
    setObjFloor(obj.floor);
    setObjKind(obj.kind);
    setObjLabel(obj.label ?? '');
    setObjWidth(obj.col_span);
    setObjHeight(obj.row_span);
    setObjDialogOpen(true);
  };

  // Find the first free spot on a floor (avoiding rooms and other objects) where a w×h rect fits
  const findObjectSpot = (floor: string, w: number, h: number, excludeId?: string) => {
    const floorRooms = rooms.filter((r) => r.floor === floor);
    const floorObjs = objects.filter((o) => o.floor === floor && o.id !== excludeId);
    const gridW = Math.max(
      w,
      ...floorRooms.map((r) => (r.floor_col ?? 0) + (r.col_span ?? 1)),
      ...floorObjs.map((o) => o.floor_col + o.col_span),
    );
    const gridH = Math.max(
      h,
      ...floorRooms.map((r) => (r.floor_row ?? 0) + (r.row_span ?? 1)),
      ...floorObjs.map((o) => o.floor_row + o.row_span),
    );
    const blocked = [
      ...floorRooms.map((r) => ({ x: r.floor_col ?? 0, y: r.floor_row ?? 0, w: r.col_span ?? 1, h: r.row_span ?? 1 })),
      ...floorObjs.map((o) => ({ x: o.floor_col, y: o.floor_row, w: o.col_span, h: o.row_span })),
    ];
    for (let y = 0; y + h <= gridH + 1; y++) {
      for (let x = 0; x + w <= gridW + 1; x++) {
        if (!blocked.some((r) => rectsOverlap({ x, y, w, h }, r))) return { x, y };
      }
    }
    return { x: 0, y: gridH }; // hiç yer yoksa altta yeni satıra koy
  };

  const handleObjectDialogSave = () => {
    if (!objFloor) {
      setError('Bir kat seçmelisiniz');
      return;
    }
    const w = Math.max(1, Math.min(12, objWidth || 1));
    const h = Math.max(1, Math.min(12, objHeight || 1));
    if (objEditing) {
      setObjects((prev) =>
        prev.map((o) =>
          o.id === objEditing.id
            ? { ...o, kind: objKind, label: objLabel.trim() || null, col_span: w, row_span: h }
            : o,
        ),
      );
    } else {
      const spot = findObjectSpot(objFloor, w, h);
      const newObj: FloorObjectItem = {
        id: crypto.randomUUID(),
        floor: objFloor,
        kind: objKind,
        label: objLabel.trim() || null,
        floor_col: spot.x,
        floor_row: spot.y,
        col_span: w,
        row_span: h,
      };
      setObjects((prev) => [...prev, newObj]);
    }
    setObjDialogOpen(false);
  };

  const handleObjectDelete = () => {
    if (!objEditing) return;
    setObjects((prev) => prev.filter((o) => o.id !== objEditing.id));
    setObjDialogOpen(false);
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
    setRoomShortCode('');
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
    setRoomShortCode(room.short_code ?? '');
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
      short_code: roomShortCode || null,
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
      short_code: roomShortCode || null,
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
    const origObjMap = new Map(originalObjects.map((o) => [o.id, o]));
    const currObjMap = new Map(objects.map((o) => [o.id, o]));

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

    const objectUpdates = objects.filter((o) => {
      const orig = origObjMap.get(o.id);
      return orig && objectChanged(orig, o);
    });
    const objectDeletes = originalObjects.filter((o) => !currObjMap.has(o.id));

    let anyError = '';

    // We will build the final states locally to avoid React async state update closure bugs
    let finalRooms = JSON.parse(JSON.stringify(rooms)) as RoomLite[];
    let finalTables = JSON.parse(JSON.stringify(tables)) as CafeTable[];
    let finalObjects = JSON.parse(JSON.stringify(objects)) as FloorObjectItem[];

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
        // 4b. Create floor objects
        const objectCreates = finalObjects.filter((o) => !origObjMap.has(o.id));
        for (const o of objectCreates) {
          const res = await fetch('/api/floor-objects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              floor: o.floor,
              kind: o.kind,
              label: o.label,
              floor_col: o.floor_col,
              floor_row: o.floor_row,
              col_span: o.col_span,
              row_span: o.row_span,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            anyError = data.error || 'Obje eklenemedi';
            break;
          }
          const tempId = o.id;
          finalObjects = finalObjects.map((item) => (item.id === tempId ? { ...item, id: data.object.id } : item));
        }
      }

      if (!anyError) {
        // 4c. Update floor objects
        for (const o of objectUpdates) {
          const res = await fetch('/api/floor-objects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: o.id,
              kind: o.kind,
              label: o.label,
              floor_col: o.floor_col,
              floor_row: o.floor_row,
              col_span: o.col_span,
              row_span: o.row_span,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            anyError = data.error || 'Obje güncellenemedi';
            break;
          }
        }
      }

      if (!anyError) {
        // 4d. Delete floor objects
        for (const o of objectDeletes) {
          const res = await fetch(`/api/floor-objects?id=${o.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            anyError = data.error || 'Obje silinemedi';
            break;
          }
          finalObjects = finalObjects.filter((item) => item.id !== o.id);
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
        setObjects(finalObjects);
        setOriginalTables(JSON.parse(JSON.stringify(finalTables)));
        setOriginalRooms(JSON.parse(JSON.stringify(finalRooms)));
        setOriginalObjects(JSON.parse(JSON.stringify(finalObjects)));
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
          <Button
            variant="outlined"
            startIcon={<Widgets />}
            onClick={() => openObjectAdd()}
            disabled={loading || saving || rooms.length === 0}
          >
            Obje Ekle
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
          floorObjects={objects}
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
          onFloorObjectMove={handleFloorObjectMove}
          onFloorObjectEdit={openObjectEdit}
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

      {/* Add/Edit Object Modal */}
      <Dialog open={objDialogOpen} onClose={() => setObjDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{objEditing ? 'Objeyi Düzenle' : 'Obje Ekle'}</span>
            {objEditing && (
              <IconButton size="small" color="error" onClick={handleObjectDelete}>
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Kat"
              value={objFloor}
              onChange={(e) => setObjFloor(e.target.value)}
              fullWidth
            >
              {floors.map((f) => (
                <MenuItem key={f} value={f}>{f}. Kat</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Tür"
              value={objKind}
              onChange={(e) => setObjKind(e.target.value)}
              fullWidth
            >
              {Object.entries(OBJECT_KINDS).map(([kind, meta]) => (
                <MenuItem key={kind} value={kind}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: meta.color, fontSize: 18 }}>
                    {meta.icon}
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>{meta.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Etiket (opsiyonel)"
              value={objLabel}
              onChange={(e) => setObjLabel(e.target.value)}
              fullWidth
              placeholder="Boş bırakılırsa tür adı kullanılır"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Genişlik (hücre)"
                type="number"
                value={objWidth}
                onChange={(e) => setObjWidth(Number(e.target.value))}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: 12 } }}
                fullWidth
              />
              <TextField
                label="Yükseklik (hücre)"
                type="number"
                value={objHeight}
                onChange={(e) => setObjHeight(Number(e.target.value))}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: 12 } }}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setObjDialogOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleObjectDialogSave}>
            {objEditing ? 'Tamam' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Room Modal */}
      <Dialog open={roomAddOpen} onClose={() => setRoomAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Yeni Bölüm Ekle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Bölüm Adı"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Kısaltma (örn: GO14)"
                value={roomShortCode}
                onChange={(e) => setRoomShortCode(e.target.value)}
                fullWidth
                placeholder="Otomatik"
              />
            </Stack>
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
            <Stack direction="row" spacing={2}>
              <TextField
                label="Bölüm Adı"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Kısaltma (örn: GO14)"
                value={roomShortCode}
                onChange={(e) => setRoomShortCode(e.target.value)}
                fullWidth
                placeholder="Otomatik"
              />
            </Stack>
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
