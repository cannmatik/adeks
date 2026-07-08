'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Chip, Select, MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar, Alert } from '@mui/material';
import { createClient } from '@/lib/supabase/client';

const statusColors: any = {
  PENDING: 'warning',
  PREPARING: 'info',
  DELIVERED: 'success',
  CANCELLED: 'error'
};

const statusLabels: any = {
  PENDING: 'Bekliyor',
  PREPARING: 'Hazırlanıyor',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal'
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const supabase = createClient();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ open: true, message: 'Siparişler yüklenirken hata oluştu.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Setting up realtime listener for orders would be ideal here
    const channel = supabase.channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setNotification({ open: true, message: 'Sipariş durumu güncellendi.', severity: 'success' });
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      setNotification({ open: true, message: err.message || 'Hata oluştu.', severity: 'error' });
    }
  };

  if (loading && orders.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>Sipariş Yönetimi</Typography>
      
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell><strong>Tarih</strong></TableCell>
              <TableCell><strong>Masa / Kullanıcı</strong></TableCell>
              <TableCell><strong>Ürünler</strong></TableCell>
              <TableCell><strong>Toplam Tutar</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>Henüz sipariş bulunmuyor.</TableCell>
              </TableRow>
            ) : (
              orders.map(order => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold' }}>Masa {order.tables?.number || 'Bilinmiyor'}</Typography>
                    <Typography variant="caption" color="text.secondary">{order.profiles?.full_name || 'Misafir'}</Typography>
                  </TableCell>
                  <TableCell>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {order.order_items?.map((item: any, i: number) => (
                        <li key={i}>
                          <Typography variant="body2">
                            {item.quantity}x {item.cafe_menu_items?.name} 
                            <Typography component="span" variant="caption" color="text.secondary"> (₺{item.unit_price})</Typography>
                          </Typography>
                        </li>
                      ))}
                    </ul>
                    {order.notes && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        Not: {order.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>₺{order.total_amount}</Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        sx={{
                          bgcolor: `${statusColors[order.status]}.main`,
                          color: `${statusColors[order.status]}.contrastText`,
                          '& .MuiSelect-icon': { color: 'inherit' },
                          fontWeight: 'bold',
                          borderRadius: 2
                        }}
                      >
                        {Object.keys(statusLabels).map(key => (
                          <MenuItem key={key} value={key}>{statusLabels[key]}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
}
