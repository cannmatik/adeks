'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  MenuItem,
  TextField,
  Stack,
  IconButton,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Refresh, Search, Security, Person, Block, CheckCircle, WorkspacePremium } from '@mui/icons-material';
import { useAuth } from '@/components/AuthProvider';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_banned?: boolean;
  created_at?: string;
  email_verified?: boolean;
}

export default function AdminUsersPage() {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kullanıcılar yüklenemedi');
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`Kullanıcı yetkisini '${newRole}' olarak değiştirmek istediğinize emin misiniz?`)) return;
    
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yetki değiştirilemedi');
      
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    const action = isBanned ? 'unban' : 'ban';
    if (!window.confirm(`Kullanıcıyı ${isBanned ? 'banını kaldırmak' : 'banlamak'} istediğinize emin misiniz?`)) return;

    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_banned: action === 'ban' } : u))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const columns: GridColDef[] = [
    { 
      field: 'full_name', 
      headerName: 'İSİM', 
      flex: 1, 
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontWeight: 500, pt: 2 }}>
          {params.value || '-'}
        </Typography>
      )
    },
    { 
      field: 'email', 
      headerName: 'E-POSTA', 
      flex: 1.5, 
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
          {params.value || '-'}
        </Typography>
      )
    },
    {
      field: 'role',
      headerName: 'MEVCUT ROL',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const isSuperAdmin = params.value === 'super_admin';
        const isAdmin = params.value === 'admin';
        return (
          <Chip
            size="small"
            icon={isSuperAdmin ? <WorkspacePremium /> : isAdmin ? <Security /> : <Person />}
            label={isSuperAdmin ? 'Süper Admin' : isAdmin ? 'Admin' : 'Müşteri'}
            color={isSuperAdmin ? 'warning' : isAdmin ? 'error' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 600, mt: 1.5 }}
          />
        );
      }
    },
    {
      field: 'created_at',
      headerName: 'KAYIT TARİHİ',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
          {params.value ? new Date(params.value).toLocaleDateString('tr-TR') : '-'}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'İŞLEM (YETKİ DEĞİŞTİR)',
      width: 200,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const user = params.row as UserProfile;
        const isTargetSuperOrAdmin = ['admin', 'super_admin'].includes(user.role || '');
        const canChangeRole = currentUserRole === 'super_admin';
        const canBan = currentUserRole === 'super_admin' || !isTargetSuperOrAdmin;

        return (
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
            <TextField
              select
              size="small"
              value={user.role || 'customer'}
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
              disabled={updating === user.id || !canChangeRole}
              sx={{ width: 130, textAlign: 'left' }}
            >
              <MenuItem value="customer">Müşteri</MenuItem>
              {canChangeRole && <MenuItem value="admin">Admin</MenuItem>}
              {canChangeRole && <MenuItem value="super_admin">Süper Admin</MenuItem>}
            </TextField>
            <Tooltip title={!canBan ? 'Bu kullanıcıyı banlamaya yetkiniz yok' : user.is_banned ? 'Banı Kaldır' : 'Banla'}>
              <span>
                <IconButton
                  color={user.is_banned ? 'success' : 'error'}
                  onClick={() => handleBanToggle(user.id, !!user.is_banned)}
                  disabled={updating === user.id || !canBan}
                >
                  {user.is_banned ? <CheckCircle /> : <Block />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      }
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Kullanıcı Yönetimi</Typography>
        <IconButton onClick={fetchUsers} disabled={loading} color="primary" sx={{ bgcolor: 'action.hover' }}>
          <Refresh />
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="İsim veya e-posta ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }
          }}
          sx={{ maxWidth: 400 }}
        />
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25, page: 0 }
            }
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'action.hover',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
          }}
        />
      </Paper>
    </Box>
  );
}
