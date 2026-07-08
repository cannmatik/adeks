'use client';

import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Button, Chip, Divider, IconButton, Snackbar, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Badge } from '@mui/material';
import { Add, Remove, ShoppingCart, Build as BuildIcon, Send as SendIcon } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';

export default function SessionPage() {
  const [session, setSession] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  
  // Support Dialog State
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

  const [rightTab, setRightTab] = useState(0);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  const supabase = createClient();

  const loadData = async () => {
    try {
      const res = await fetch('/api/session/active');
      const data = await res.json();
      setSession(data.session);

      const { data: menuData } = await supabase
          .from('cafe_menu_items')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('name');
        
        if (menuData && menuData.length > 0) {
          setMenuItems(menuData);
          setSelectedCategory(menuData[0].category);
        }
      } catch (err) {
        console.error('Error loading session data', err);
      } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [supabase]);

  useEffect(() => {
    if (!session || !session.hourly_rate_snapshot) return;
    
    const calculateTotal = () => {
      const ms = Math.max(0, Date.now() - new Date(session.started_at).getTime());
      const hours = ms / 3_600_000;
      setElapsedTotal(Math.round(hours * Number(session.hourly_rate_snapshot)));
    };
    
    calculateTotal();
    const interval = setInterval(calculateTotal, 60000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('user_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `session_id=eq.${session.id}` }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, supabase]);

  const updateCart = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      const newCart = { ...prev };
      if (next === 0) delete newCart[itemId];
      else newCart[itemId] = next;
      return newCart;
    });
  };

  const handleOrder = async () => {
    if (!session || Object.keys(cart).length === 0) return;
    setSubmitting(true);
    
    try {
      const items = Object.entries(cart).map(([menu_item_id, quantity]) => ({
        menu_item_id,
        quantity
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          items,
          notes: ''
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ open: true, message: 'Siparişiniz başarıyla alındı ve hesaba yazıldı!', severity: 'success' });
      setCart({});
      setRightTab(1); // switch to orders tab
      loadData();
    } catch (err: any) {
      setNotification({ open: true, message: err.message || 'Sipariş gönderilirken hata oluştu.', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupport = async () => {
    if (!session || !supportMessage.trim()) return;
    setSendingSupport(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          message: supportMessage
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ open: true, message: 'Teknik destek talebiniz iletildi.', severity: 'success' });
      setSupportOpen(false);
      setSupportMessage('');
    } catch (err: any) {
      setNotification({ open: true, message: err.message || 'Destek talebi gönderilemedi.', severity: 'error' });
    } finally {
      setSendingSupport(false);
    }
  };

  const ordersTotal = useMemo(() => {
    if (!session || !session.orders) return 0;
    return session.orders.reduce((sum: number, o: any) => {
      if (o.status !== 'CANCELLED') return sum + Number(o.total_amount);
      return sum;
    }, 0);
  }, [session]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  if (!session) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Aktif Oturum Bulunamadı</Typography>
        <Typography color="text.secondary">Sipariş verebilmek veya destek talebi oluşturabilmek için bir masada aktif oturumunuz olması gerekmektedir.</Typography>
      </Box>
    );
  }

  // Categories
  const categories = Array.from(new Set(menuItems.map(m => m.category)));
  const visibleItems = menuItems.filter(m => m.category === selectedCategory);

  const cartTotal = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);


  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Sipariş Ekranı</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => setCartOpen(true)}
            sx={{ fontWeight: 'bold' }}
            startIcon={
              <Badge badgeContent={Object.keys(cart).length} color="error">
                <ShoppingCart />
              </Badge>
            }
          >
            Sepet & Siparişler
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            startIcon={<BuildIcon />}
            onClick={() => setSupportOpen(true)}
            sx={{ fontWeight: 'bold' }}
          >
            Teknik Servis
          </Button>
        </Box>
      </Box>
      
      <Card sx={{ mb: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Masa: {session.tables?.number || 'Bilinmiyor'}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>Oturum Başlangıcı: {new Date(session.started_at).toLocaleTimeString()}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Chip label="Aktif Oturum" color="success" sx={{ bgcolor: 'rgba(255,255,255,0.2)', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Hesap: ₺{elapsedTotal + ordersTotal}
            </Typography>
            {session.hourly_rate_snapshot && (
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                (Masa: ₺{elapsedTotal} + Siparişler: ₺{ordersTotal})
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={selectedCategory} 
              onChange={(e, v) => setSelectedCategory(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              {categories.map(cat => (
                <Tab key={cat} label={cat} value={cat} sx={{ fontWeight: 'bold' }} />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {visibleItems.map(item => (
              <Box key={item.id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>
                      <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 'bold' }}>₺{item.price}</Typography>
                    </Box>
                    {item.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{item.description}</Typography>
                    )}
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {cart[item.id] ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.default', borderRadius: 2 }}>
                        <IconButton size="small" onClick={() => updateCart(item.id, -1)}><Remove fontSize="small" /></IconButton>
                        <Typography sx={{ fontWeight: 'bold' }}>{cart[item.id]}</Typography>
                        <IconButton size="small" onClick={() => updateCart(item.id, 1)}><Add fontSize="small" /></IconButton>
                      </Box>
                    ) : (
                      <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => updateCart(item.id, 1)}>
                        Ekle
                      </Button>
                    )}
                  </Box>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>

      </Box>

      {/* Cart & Orders Dialog */}
      <Dialog open={cartOpen} onClose={() => setCartOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={rightTab} onChange={(e, v) => setRightTab(v)} variant="fullWidth">
              <Tab label="Sepetim" />
              <Tab label="Siparişlerim" />
            </Tabs>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {rightTab === 0 ? (
            <Box>
              {Object.keys(cart).length === 0 ? (
                <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>Sepetiniz boş.</Typography>
              ) : (
                <Box>
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = menuItems.find(m => m.id === id);
                    if (!item) return null;
                    return (
                      <Box key={id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{qty}x {item.name}</Typography>
                        <Typography variant="body2">₺{(item.price * qty).toFixed(2)}</Typography>
                      </Box>
                    );
                  })}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6">Toplam:</Typography>
                    <Typography variant="h6" color="primary.main">₺{cartTotal.toFixed(2)}</Typography>
                  </Box>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="primary" 
                    size="large"
                    disabled={submitting}
                    onClick={handleOrder}
                  >
                    {submitting ? <CircularProgress size={24} color="inherit" /> : 'Siparişi Ver (Hesaba Yaz)'}
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              {(!session.orders || session.orders.length === 0) ? (
                <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>Henüz siparişiniz yok.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {session.orders.map((o: any) => (
                    <Box key={o.id} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Sipariş (₺{o.total_amount})</Typography>
                        <Chip size="small" 
                          label={o.status === 'PENDING' ? 'Bekliyor' : o.status === 'PREPARING' ? 'Hazırlanıyor' : o.status === 'DELIVERED' ? 'Teslim Edildi' : 'İptal'} 
                          color={o.status === 'PENDING' ? 'warning' : o.status === 'PREPARING' ? 'info' : o.status === 'DELIVERED' ? 'success' : 'error'} 
                        />
                      </Box>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {o.order_items?.map((item: any, i: number) => (
                          <li key={i}><Typography variant="caption">{item.quantity}x {item.cafe_menu_items?.name}</Typography></li>
                        ))}
                      </ul>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCartOpen(false)} color="inherit">Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Support Dialog */}
      <Dialog open={supportOpen} onClose={() => !sendingSupport && setSupportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Teknik Servis Çağır</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Lütfen yaşadığınız sorunu kısaca açıklayın. Teknik ekibimiz masanıza yönlendirilecektir.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {['Kulaklık çalışmıyor', 'Mouse sorunu var', 'Klavye sorunu var', 'Monitör kapanıyor', 'İnternet bağlantısı koptu'].map(issue => (
              <Chip 
                key={issue} 
                label={issue} 
                onClick={() => setSupportMessage(issue)} 
                variant={supportMessage === issue ? 'filled' : 'outlined'}
                color={supportMessage === issue ? 'primary' : 'default'}
              />
            ))}
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Farklı bir sorununuz varsa buraya yazabilirsiniz..."
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupportOpen(false)} color="inherit" disabled={sendingSupport}>İptal</Button>
          <Button 
            onClick={handleSupport} 
            color="warning" 
            variant="contained" 
            disabled={!supportMessage.trim() || sendingSupport}
            endIcon={sendingSupport ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          >
            Gönder
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
}
