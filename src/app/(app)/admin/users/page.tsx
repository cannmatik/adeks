'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import { Refresh, Search, Security, Person, Block, CheckCircle } from '@mui/icons-material';

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
    return (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" sx={{ mb: 4, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Kullanıcı Yönetimi
        </Typography>
        <IconButton onClick={fetchUsers} disabled={loading} color="primary">
          <Refresh />
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="İsim veya e-posta ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ width: 300 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell>İsim</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Mevcut Rol</TableCell>
              <TableCell>Kayıt Tarihi</TableCell>
              <TableCell align="right">İşlem (Yetki Değiştir)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Kullanıcı bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{user.full_name || 'İsimsiz'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <Chip size="small" icon={<Security fontSize="small" />} label="Admin" color="error" variant="outlined" />
                    ) : (
                      <Chip size="small" icon={<Person fontSize="small" />} label="Müşteri" color="default" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                      <TextField
                        select
                        size="small"
                        value={user.role || 'customer'}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updating === user.id}
                        sx={{ width: 130, textAlign: 'left' }}
                      >
                        <MenuItem value="customer">Müşteri</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                      </TextField>
                      <Tooltip title={user.is_banned ? 'Banı Kaldır' : 'Banla'}>
                        <IconButton
                          color={user.is_banned ? 'success' : 'error'}
                          onClick={() => handleBanToggle(user.id, !!user.is_banned)}
                          disabled={updating === user.id}
                        >
                          {user.is_banned ? <CheckCircle /> : <Block />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
