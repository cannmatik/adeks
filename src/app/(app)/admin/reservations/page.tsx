'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { CheckCircle, Cancel, DoneAll, MarkChatUnread, ChatBubbleOutlined, DeleteOutlined, InfoOutlined } from '@mui/icons-material';
import ChatPanel from '@/components/messages/ChatPanel';
import ReservationDetails from '@/components/admin/ReservationDetails';
import { RESERVATION_LABEL, ReservationStatus } from '@/lib/categories';
import { createClient } from '@/lib/supabase/client';

const filters: (ReservationStatus | 'ALL')[] = [
  'ALL',
  'HOLD',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

const ActionMenuCell = ({ r, updateStatus, deleteReservation, updatingId }: any) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const open = Boolean(anchorEl);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Button size="small" variant="outlined" color="primary" onClick={handleClick} disabled={updatingId === r.id}>
        İşlem
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {r.status === 'HOLD' && <MenuItem onClick={() => { updateStatus(r.id, 'CONFIRMED'); handleClose(); }}>Onayla</MenuItem>}
        {r.status === 'HOLD' && <MenuItem onClick={() => { updateStatus(r.id, 'CANCELLED'); handleClose(); }}>Reddet</MenuItem>}
        {r.status === 'CONFIRMED' && <MenuItem onClick={() => { updateStatus(r.id, 'COMPLETED'); handleClose(); }}>Tamamla</MenuItem>}
        <MenuItem onClick={() => { deleteReservation(r.id); handleClose(); }} sx={{ color: 'error.main' }}>Sil</MenuItem>
      </Menu>
    </>
  );
};

export default function AdminReservationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgReservationId, setMsgReservationId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const chat = searchParams.get('chat');
    if (chat) {
      setMsgReservationId(chat);
      setMsgOpen(true);
    }
  }, [searchParams]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/reservations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setItems(data.reservations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const supabase = createClient();
    const ch = supabase
      .channel('admin-reservations-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) load();
      else setError((await res.json()).error);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteReservation = async (id: string) => {
    if (!confirm('Bu rezervasyonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) load();
      else setError((await res.json()).error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.status === filter);

  const stats = useMemo(() => {
    const total = items.length;
    const hold = items.filter((i) => i.status === 'HOLD').length;
    const confirmed = items.filter((i) => i.status === 'CONFIRMED').length;
    return { total, hold, confirmed };
  }, [items]);

  const statCard = (label: string, value: number, color: string) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
        minWidth: 120,
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 800, color }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Paper>
  );

  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'Kullanıcı',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {params.row.owner?.full_name || params.row.owner?.email || 'Bilinmiyor'}
        </Typography>
      ),
    },
    {
      field: 'start_time',
      headerName: 'Rezervasyon',
      flex: 1,
      minWidth: 200,
      valueGetter: (value, row) => new Date(row.start_time),
      renderCell: (params: GridRenderCellParams) => {
        const start = new Date(params.row.start_time);
        const end = new Date(params.row.end_time);
        return (
          <Typography variant="body2">
            {start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Oluşturulma',
      width: 150,
      valueGetter: (value, row) => new Date(row.created_at),
      renderCell: (params: GridRenderCellParams) => {
        const created = new Date(params.row.created_at);
        return (
          <Stack spacing={0.5} sx={{ justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2">{created.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{created.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Typography>
          </Stack>
        );
      },
    },
    {
      field: 'tables',
      headerName: 'Masalar',
      flex: 1,
      minWidth: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const tables = params.row.tables || [];
        if (tables.length === 0) return <Typography variant="body2">-</Typography>;
        if (tables.length === 1) {
          return <Chip label={`#${tables[0].table?.number}`} size="small" sx={{ fontWeight: 700 }} />;
        }
        const text = tables.map((rt: any) => `#${rt.table?.number}`).join(', ');
        return (
          <Tooltip title={text} arrow placement="top">
            <Chip label={`${tables.length} Masa`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, cursor: 'default' }} />
          </Tooltip>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Durum',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const colors: Record<string, string> = {
          HOLD: 'warning',
          CONFIRMED: 'success',
          COMPLETED: 'primary',
          CANCELLED: 'error',
          REQUESTED: 'default',
        };
        return (
          <Chip
            label={RESERVATION_LABEL[params.row.status as ReservationStatus] || params.row.status}
            color={colors[params.row.status] as any || 'default'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'İşlemler',
      minWidth: 320,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const r = params.row;
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
            <IconButton 
              color={r.unread_count > 0 ? "primary" : "default"}
              onClick={(e) => { e.stopPropagation(); setMsgReservationId(r.id); setMsgOpen(true); }}
              title="Mesajlar"
            >
              <Badge color="error" variant="dot" invisible={!(r.unread_count > 0)}>
                {r.unread_count > 0 ? <MarkChatUnread color="primary" /> : <ChatBubbleOutlined sx={{ opacity: 0.3 }} />}
              </Badge>
            </IconButton>
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); setDetailsData(r); }} 
              title="Detaylar"
            >
              <InfoOutlined />
            </IconButton>
            <ActionMenuCell r={r} updateStatus={updateStatus} deleteReservation={deleteReservation} updatingId={updatingId} />
          </Stack>
        );
      },
    },
  ];

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" sx={{ mb: 0.5, flexShrink: 0 }}>
        Rezervasyonlar
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, flexShrink: 0 }}>
        Tüm müşteri taleplerini incele ve durumlarını güncelle.
      </Typography>

      {/* İstatistikler */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 2, flexShrink: 0 }}>
        {statCard('Toplam', stats.total, 'text.primary')}
        {statCard('Bekleyen', stats.hold, 'warning.main')}
        {statCard('Onaylı', stats.confirmed, 'success.main')}
      </Stack>

      {/* Filtreler */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 3, flexShrink: 0 }}>
        {filters.map((f) => (
          <Chip
            key={f}
            label={f === 'ALL' ? 'Tümü' : RESERVATION_LABEL[f]}
            onClick={() => setFilter(f)}
            color={filter === f ? 'primary' : 'default'}
            variant={filter === f ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* DataGrid Container */}
      <Paper elevation={0} sx={{ flexGrow: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          onRowClick={(params) => setDetailsData(params.row)}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
            sorting: {
              sortModel: [{ field: 'start_time', sort: 'asc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
          }}
        />
      </Paper>

      {/* Mesajlaşma Dialogu */}
      <Dialog
        open={msgOpen}
        onClose={() => { setMsgOpen(false); load(); }}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { height: '70vh' } } }}
      >
        <DialogTitle sx={{ pb: 1 }}>Rezervasyon Mesajları</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {msgReservationId && <ChatPanel reservationId={msgReservationId} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsData} onClose={() => setDetailsData(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Rezervasyon Detayları</DialogTitle>
        <DialogContent dividers>
          {detailsData && (
            <ReservationDetails 
              reservation={detailsData}
              isAdmin
              onUpdateStatus={updateStatus}
              onDelete={deleteReservation}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
