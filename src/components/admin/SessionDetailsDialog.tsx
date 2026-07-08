'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Stack,
  Paper,
  Box,
  TextField,
  MenuItem,
  Alert,
  Autocomplete,
  createFilterOptions
} from '@mui/material';
import { ReportProblem } from '@mui/icons-material';

interface SessionDetailsDialogProps {
  open: boolean;
  sessionDetails: any | null;
  onClose: () => void;
  menuItems: any[];
  onResolveSupport: (sessionId: string) => void;
  onEndSession: (sessionId: string) => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onAddOrder: (sessionId: string, menuItemId: string, quantity: number) => Promise<boolean>;
}

export default function SessionDetailsDialog({
  open,
  sessionDetails,
  onClose,
  menuItems,
  onResolveSupport,
  onEndSession,
  onUpdateOrderStatus,
  onAddOrder,
}: SessionDetailsDialogProps) {
  const [orderItemToAdd, setOrderItemToAdd] = useState<any | null>(null);
  const [orderQuantityToAdd, setOrderQuantityToAdd] = useState<number>(1);
  const [addingOrder, setAddingOrder] = useState(false);

  const handleAddClick = async () => {
    if (!sessionDetails || !orderItemToAdd || orderQuantityToAdd < 1) return;
    setAddingOrder(true);
    const success = await onAddOrder(sessionDetails.id, orderItemToAdd.id, orderQuantityToAdd);
    if (success) {
      setOrderItemToAdd(null);
      setOrderQuantityToAdd(1);
    }
    setAddingOrder(false);
  };

  const filterOptions = createFilterOptions({
    matchFrom: 'any',
    stringify: (option: any) => `${option.name} ${option.code || ''} ${option.category || ''}`,
  });

  if (!sessionDetails) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Masa #{sessionDetails.table?.number} Detayları</DialogTitle>
      <DialogContent dividers>
        {sessionDetails.needs_support && (
          <Alert
            severity="error"
            icon={<ReportProblem fontSize="inherit" />}
            action={
              <Button color="inherit" size="small" onClick={() => onResolveSupport(sessionDetails.id)}>
                Çözüldü Olarak İşaretle
              </Button>
            }
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Müşteri teknik destek talep etti!</Typography>
            {sessionDetails.support_message && (
              <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                &quot;{sessionDetails.support_message}&quot;
              </Typography>
            )}
          </Alert>
        )}

        <Typography variant="subtitle1" gutterBottom>
          <strong>Müşteri:</strong> {sessionDetails.kind === 'MEMBER' ? (sessionDetails.user?.full_name || sessionDetails.user?.email) : sessionDetails.anonymous_label}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          <strong>Başlangıç:</strong> {new Date(sessionDetails.started_at).toLocaleTimeString()}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>Siparişler</Typography>
        {(!sessionDetails.orders || sessionDetails.orders.length === 0) ? (
          <Typography color="text.secondary">Sipariş bulunmuyor.</Typography>
        ) : (
          <Stack spacing={2}>
            {sessionDetails.orders.map((o: any) => (
              <Paper key={o.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Sipariş (₺{o.total_amount})</Typography>
                  <TextField
                    select
                    size="small"
                    value={o.status}
                    onChange={(e) => onUpdateOrderStatus(o.id, e.target.value)}
                  >
                    <MenuItem value="PENDING">Bekliyor</MenuItem>
                    <MenuItem value="PREPARING">Hazırlanıyor</MenuItem>
                    <MenuItem value="DELIVERED">Teslim Edildi</MenuItem>
                    <MenuItem value="CANCELLED">İptal</MenuItem>
                  </TextField>
                </Box>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {o.order_items?.map((item: any, i: number) => (
                    <li key={i}><Typography variant="caption">{item.quantity}x {item.cafe_menu_items?.name}</Typography></li>
                  ))}
                </ul>
              </Paper>
            ))}
          </Stack>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>Yeni Sipariş Ekle</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Autocomplete
            options={menuItems}
            filterOptions={filterOptions}
            getOptionLabel={(option) => `${option.code ? `[${option.code}] ` : ''}${option.name} (${option.price} ₺)`}
            value={orderItemToAdd}
            onChange={(_, newValue) => setOrderItemToAdd(newValue)}
            sx={{ flexGrow: 1 }}
            size="small"
            renderInput={(params) => <TextField {...params} label="Ürün Ara (İsim veya Kod)" />}
          />
          <TextField
            type="number"
            size="small"
            label="Adet"
            value={orderQuantityToAdd}
            onChange={(e) => setOrderQuantityToAdd(Number(e.target.value))}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ width: 80 }}
          />
          <Button 
            variant="contained" 
            disabled={!orderItemToAdd || addingOrder || orderQuantityToAdd < 1}
            onClick={handleAddClick}
          >
            {addingOrder ? '...' : 'Ekle'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={() => {
            if (confirm('Oturumu kapatmak istediğinize emin misiniz?')) {
              onEndSession(sessionDetails.id);
            }
          }}
        >
          Oturumu Kapat
        </Button>
        <Button variant="contained" onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
}
