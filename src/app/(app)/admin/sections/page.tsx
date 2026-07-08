'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Box, Button, MenuItem, Stack, TextField, Typography, Chip, Alert,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle
} from '@mui/material';
import { Edit, Delete, Map, MeetingRoom, Add, ExpandMore, Search } from '@mui/icons-material';
import { RoomLite, CafeTable } from '@/components/tables/TableCard';
import CategoryBadge from '@/components/tables/CategoryBadge';
import { TableCategory, TableStatus, STATUS_LABEL, STATUS_COLOR } from '@/lib/categories';
import { useCategories } from '@/components/CategoryProvider';

interface RoomFormState {
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
  short_code: string;
}

const emptyRoomForm: RoomFormState = {
  name: '',
  floor: '1',
  color: '#7E7E85',
  col_span: 8,
  row_span: 5,
  category: '',
  floor_col: 0,
  floor_row: 0,
  display_order: 0,
  short_code: '',
};

interface TableFormState {
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

const emptyTableForm: TableFormState = {
  number: 0,
  category: 'SILVER',
  status: 'AVAILABLE',
  notes: '',
  shape: 'SQUARE',
  room_id: '',
  position_x: 0,
  position_y: 0,
};

const statuses: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

export default function AdminSectionsPage() {
  const { categories: dbCategories, categoryMeta } = useCategories();
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  // Room Dialog State
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomForm, setRoomForm] = useState<RoomFormState>(emptyRoomForm);
  const [savingRoom, setSavingRoom] = useState(false);

  // Table Dialog State
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableForm, setTableForm] = useState<TableFormState>(emptyTableForm);
  const [savingTable, setSavingTable] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    const [roomsRes, tablesRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/tables')
    ]);
    const roomsData = await roomsRes.json();
    const tablesData = await tablesRes.json();
    
    if (roomsRes.ok) setRooms(roomsData.rooms || []);
    else setError(roomsData.error);
    
    if (tablesRes.ok) setTables(tablesData.tables || []);
    else setError(tablesData.error);
    
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Room Handlers
  const openNewRoom = () => {
    setRoomForm({ ...emptyRoomForm, display_order: rooms.length });
    setRoomDialogOpen(true);
  };

  const openEditRoom = (r: RoomLite) => {
    setRoomForm({
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
      short_code: (r as any).short_code ?? '',
    });
    setRoomDialogOpen(true);
  };

  const handleSaveRoom = async () => {
    setSavingRoom(true);
    setError('');
    setSuccess('');
    try {
      const autoColor = roomForm.category ? (categoryMeta[roomForm.category]?.color || '#7E7E85') : '#7E7E85';
      const body = { ...roomForm, category: roomForm.category || null, color: autoColor };
      const res = roomForm.id
        ? await fetch('/api/rooms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bölüm kaydedilemedi');
      
      setSuccess(roomForm.id ? 'Bölüm güncellendi' : 'Yeni bölüm eklendi');
      setRoomDialogOpen(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Bu bölümü silmek istediğine emin misin? İçindeki masalar da silinecek.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi');
      setSuccess('Bölüm başarıyla silindi');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Table Handlers
  const openNewTable = (roomId: string) => {
    const nextNumber = (tables.reduce((max, t) => Math.max(max, t.number), 0) || 0) + 1;
    const room = rooms.find(r => r.id === roomId);
    setTableForm({ 
      ...emptyTableForm, 
      number: nextNumber, 
      room_id: roomId,
      category: (room?.category as TableCategory) || 'SILVER'
    });
    setTableDialogOpen(true);
  };

  const openEditTable = (t: CafeTable) => {
    setTableForm({
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
    setTableDialogOpen(true);
  };

  const handleSaveTable = async () => {
    setSavingTable(true);
    setError('');
    setSuccess('');
    try {
      const body = { ...tableForm };
      const res = tableForm.id
        ? await fetch('/api/tables', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Masa kaydedilemedi');
      
      setSuccess(tableForm.id ? 'Masa güncellendi' : 'Yeni masa eklendi');
      setTableDialogOpen(false);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingTable(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Bu masayı silmek istediğine emin misin?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tables?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi');
      setSuccess('Masa başarıyla silindi');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const tablesByRoom = useMemo(() => {
    const map: Record<string, CafeTable[]> = {};
    rooms.forEach(r => map[r.id] = []);
    map['unassigned'] = [];
    
    tables.forEach(t => {
      const isMatch = !searchQuery || t.number.toString().includes(searchQuery);
      if (!isMatch) return;

      const roomId = t.room?.id || 'unassigned';
      if (!map[roomId]) map[roomId] = [];
      map[roomId].push(t);
    });
    return map;
  }, [tables, rooms, searchQuery]);

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Bölüm ve Masa Yönetimi</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Bölümleri ve masaları hiyerarşik olarak yönetin.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Map />} href="/admin/floor-plan" component="a">
            Salon Düzeni
          </Button>
          <Button variant="contained" startIcon={<MeetingRoom />} onClick={openNewRoom}>
            Yeni Bölüm
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Masa numarasına göre ara..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />
            }
          }}
          sx={{ width: 300 }}
        />
      </Box>

      {loading ? (
        <Typography>Yükleniyor...</Typography>
      ) : (
        <Box>
          {rooms.map(room => {
            const roomTables = tablesByRoom[room.id] || [];
            // If searching and no tables match in this room, and we are not creating new, maybe collapse or hide.
            // For now, always show rooms.
            const catLabel = room.category ? (categoryMeta[room.category]?.label ?? room.category) : '';
            return (
              <Accordion key={room.id} defaultExpanded={searchQuery !== '' || roomTables.length > 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%', pr: 2 }}>
                    <Box
                      sx={{
                        width: 12, height: 12, borderRadius: '50%',
                        bgcolor: room.color || '#7E7E85', flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ fontWeight: 600, minWidth: 150 }}>{room.name} {room.short_code ? `(${room.short_code})` : ''}</Typography>
                    <Chip size="small" label={`${room.floor ?? '1'}. Kat`} variant="outlined" />
                    {catLabel && <Chip size="small" label={catLabel} sx={{ bgcolor: `${categoryMeta[room.category as string]?.color ?? '#7E7E85'}20` }} />}
                    <Typography variant="caption" sx={{ color: 'text.disabled', ml: 2, fontFamily: 'monospace' }}>
                      x1:{room.floor_col ?? 0} y1:{room.floor_row ?? 0} x2:{(room.floor_col ?? 0) + (room.col_span ?? 1)} y2:{(room.floor_row ?? 0) + (room.row_span ?? 1)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', ml: 'auto !important' }}>
                      {roomTables.length} Masa
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'background.default', p: 0 }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
                    <Button size="small" startIcon={<Edit />} onClick={() => openEditRoom(room)}>Bölümü Düzenle</Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDeleteRoom(room.id)}>Bölümü Sil</Button>
                    <Button size="small" variant="contained" startIcon={<Add />} onClick={() => openNewTable(room.id)} sx={{ ml: 'auto' }}>Masa Ekle</Button>
                  </Box>
                  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>No</TableCell>
                          <TableCell>Kategori</TableCell>
                          <TableCell>Durum</TableCell>
                          <TableCell>Şekil</TableCell>
                          <TableCell>Koordinat</TableCell>
                          <TableCell align="right">İşlemler</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {roomTables.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              Bu bölümde masa bulunmuyor.
                            </TableCell>
                          </TableRow>
                        ) : (
                          roomTables.map(t => (
                            <TableRow key={t.id} hover>
                              <TableCell sx={{ fontWeight: 600, color: categoryMeta[t.category]?.color ?? '#C0C0C0' }}>
                                #{t.number}
                              </TableCell>
                              <TableCell><CategoryBadge category={t.category} /></TableCell>
                              <TableCell>
                                <Chip size="small" label={STATUS_LABEL[t.status]} color={STATUS_COLOR[t.status]} variant="outlined" />
                              </TableCell>
                              <TableCell>{t.shape === 'ROUND' ? 'Yuvarlak' : 'Kare'}</TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: 13, fontFamily: 'monospace' }}>
                                x1:{t.position_x ?? 0} y1:{t.position_y ?? 0}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" onClick={() => openEditTable(t)} color="primary"><Edit fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={() => handleDeleteTable(t.id)} color="error"><Delete fontSize="small" /></IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* Unassigned Tables */}
          {(tablesByRoom['unassigned']?.length > 0 || searchQuery !== '') && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>Atanmamış Masalar</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 'auto !important' }}>
                  {tablesByRoom['unassigned']?.length || 0} Masa
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: 'background.default', p: 0 }}>
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>No</TableCell>
                        <TableCell>Kategori</TableCell>
                        <TableCell>Durum</TableCell>
                        <TableCell>Şekil</TableCell>
                        <TableCell>Koordinat</TableCell>
                        <TableCell align="right">İşlemler</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tablesByRoom['unassigned']?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            Masa bulunamadı.
                          </TableCell>
                        </TableRow>
                      ) : (
                        tablesByRoom['unassigned'].map(t => (
                          <TableRow key={t.id} hover>
                            <TableCell sx={{ fontWeight: 600 }}>#{t.number}</TableCell>
                            <TableCell><CategoryBadge category={t.category} /></TableCell>
                            <TableCell>
                              <Chip size="small" label={STATUS_LABEL[t.status]} color={STATUS_COLOR[t.status]} variant="outlined" />
                            </TableCell>
                            <TableCell>{t.shape === 'ROUND' ? 'Yuvarlak' : 'Kare'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: 13, fontFamily: 'monospace' }}>
                              x1:{t.position_x ?? 0} y1:{t.position_y ?? 0}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => openEditTable(t)} color="primary"><Edit fontSize="small" /></IconButton>
                              <IconButton size="small" onClick={() => handleDeleteTable(t.id)} color="error"><Delete fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {/* Room Dialog */}
      <Dialog open={roomDialogOpen} onClose={() => setRoomDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{roomForm.id ? 'Bölümü Düzenle' : 'Yeni Bölüm'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Bölüm Adı" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} fullWidth required />
            <TextField label="Kısaltma (örn: GO14)" value={roomForm.short_code} onChange={(e) => setRoomForm({ ...roomForm, short_code: e.target.value })} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Kat" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Genişlik (Sütun)" type="number" value={roomForm.col_span} onChange={(e) => setRoomForm({ ...roomForm, col_span: Math.max(1, Number(e.target.value)) })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Yükseklik (Satır)" type="number" value={roomForm.row_span} onChange={(e) => setRoomForm({ ...roomForm, row_span: Math.max(1, Number(e.target.value)) })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="X Pozisyonu" type="number" value={roomForm.floor_col} onChange={(e) => setRoomForm({ ...roomForm, floor_col: Math.max(0, Number(e.target.value)) })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Y Pozisyonu" type="number" value={roomForm.floor_row} onChange={(e) => setRoomForm({ ...roomForm, floor_row: Math.max(0, Number(e.target.value)) })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <TextField select label="Kategori" value={roomForm.category} onChange={(e) => setRoomForm({ ...roomForm, category: e.target.value as TableCategory | '' })} fullWidth>
              <MenuItem value="">— Seçilmedi —</MenuItem>
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Sıralama" type="number" value={roomForm.display_order} onChange={(e) => setRoomForm({ ...roomForm, display_order: Number(e.target.value) })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 2 }}>
          <Button onClick={() => setRoomDialogOpen(false)} disabled={savingRoom}>İptal</Button>
          <Button onClick={handleSaveRoom} variant="contained" disabled={savingRoom}>
            {savingRoom ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={tableDialogOpen} onClose={() => setTableDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{tableForm.id ? 'Masayı Düzenle' : 'Yeni Masa'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Numara" type="number" value={tableForm.number} onChange={(e) => setTableForm({ ...tableForm, number: Number(e.target.value) })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField select label="Kategori" value={tableForm.category} onChange={(e) => setTableForm({ ...tableForm, category: e.target.value as TableCategory })} fullWidth>
              {dbCategories.map((c) => (
                <MenuItem key={c.name} value={c.name}>{categoryMeta[c.name]?.label ?? c.label}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Bölüm" value={tableForm.room_id} onChange={(e) => {
                const newRoomId = e.target.value;
                const newRoom = rooms.find(r => r.id === newRoomId);
                setTableForm({ ...tableForm, room_id: newRoomId, category: (newRoom?.category || tableForm.category) as TableCategory });
              }} fullWidth>
              <MenuItem value="">— Seçilmedi —</MenuItem>
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="X Pozisyonu" type="number" value={tableForm.position_x} onChange={(e) => setTableForm({ ...tableForm, position_x: Number(e.target.value) })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              <TextField label="Y Pozisyonu" type="number" value={tableForm.position_y} onChange={(e) => setTableForm({ ...tableForm, position_y: Number(e.target.value) })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            </Stack>
            <TextField select label="Durum" value={tableForm.status} onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as TableStatus })} fullWidth>
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Şekil" value={tableForm.shape} onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value })} fullWidth>
              <MenuItem value="SQUARE">Kare</MenuItem>
              <MenuItem value="ROUND">Yuvarlak</MenuItem>
            </TextField>
            <TextField label="Not (opsiyonel)" multiline minRows={2} value={tableForm.notes} onChange={(e) => setTableForm({ ...tableForm, notes: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 2 }}>
          <Button onClick={() => setTableDialogOpen(false)} disabled={savingTable}>İptal</Button>
          <Button onClick={handleSaveTable} variant="contained" disabled={savingTable}>
            {savingTable ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
