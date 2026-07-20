'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  EventSeat,
  Chat,
  AdminPanelSettings,
  TableRestaurant,
  EventAvailable,
  Logout,
  SportsEsports,
  Bolt,
  Map,
  Person,
  Close,
  Category as CategoryIcon,
  MeetingRoom,
  Settings,
  RestaurantMenu,
} from '@mui/icons-material';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';
import ChangePasswordDialog from './ChangePasswordDialog';

const DRAWER_WIDTH = 240;

const customerLinks = [
  { href: '/dashboard', label: 'Masalar', icon: <DashboardIcon /> },
  { href: '/reservations', label: 'Rezervasyonlarım', icon: <EventSeat /> },
];

const adminLinks = [
  { href: '/admin/sessions', label: 'Anlık Durum', icon: <Bolt /> },
  { href: '/admin/floor-plan', label: 'Salon Düzeni', icon: <Map /> },
  { href: '/admin/sections', label: 'Bölüm / Masa Yönetimi', icon: <MeetingRoom /> },
  { href: '/admin/categories', label: 'Kategori Yönetimi', icon: <CategoryIcon /> },
  { href: '/admin/menu', label: 'Menü Yönetimi', icon: <RestaurantMenu /> },
  { href: '/admin/reservations', label: 'Rezervasyonlar', icon: <EventAvailable /> },
  { href: '/admin/users', label: 'Kullanıcılar', icon: <Person /> },
  { href: '/admin/settings', label: 'Kafe Ayarları', icon: <Settings /> },
];

import { SxProps, Theme } from '@mui/material/styles';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  variant?: 'permanent' | 'temporary';
  sx?: SxProps<Theme>;
}

export default function Sidebar({ mobileOpen = false, onMobileClose, variant = 'permanent', sx }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user } = useAuth();
  const supabase = createClient();

  const [profileOpen, setProfileOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [adeksMemberNo, setAdeksMemberNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('full_name, adeks_member_no')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name ?? '');
            setAdeksMemberNo(data.adeks_member_no ?? '');
          }
        });

      fetch('/api/session/active')
        .then(res => res.json())
        .then(data => {
          if (data.session) {
            setHasActiveSession(true);
          } else {
            setHasActiveSession(false);
          }
        })
        .catch(err => console.error('Error checking active session:', err));
    }
  }, [user, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          adeks_member_no: adeksMemberNo.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi');
      setProfileOpen(false);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const drawerContent = (
    <>
      <Toolbar sx={{ px: 2, py: 1 }}>
        <Box sx={(theme) => ({ bgcolor: '#000', ...theme.applyStyles('dark', { bgcolor: 'transparent' }), borderRadius: 1.5, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' })}>
          <img src="/adeks.png" alt="ADEKS" style={{ height: 32, objectFit: 'contain' }} />
        </Box>
        {variant === 'temporary' && (
          <IconButton onClick={onMobileClose} sx={{ ml: 'auto' }}>
            <Close />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
        <List dense>
          {!user?.email?.startsWith('anon_') && customerLinks.map((l) => (
            <ListItem key={l.href} disablePadding>
              <ListItemButton
                component={Link}
                href={l.href}
                selected={pathname === l.href || pathname.startsWith(l.href + '/')}
                onClick={variant === 'temporary' ? onMobileClose : undefined}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{l.icon}</ListItemIcon>
                <ListItemText primary={l.label} />
              </ListItemButton>
            </ListItem>
          ))}
          {hasActiveSession && (
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/session"
                selected={pathname === '/session'}
                onClick={variant === 'temporary' ? onMobileClose : undefined}
                sx={{
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
                  color: 'success.main',
                  '&:hover': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.25)' : 'rgba(76, 175, 80, 0.2)',
                  },
                  borderRadius: 1,
                  mb: 1,
                  mt: 1
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><RestaurantMenu /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 'bold' }}>Aktif Oturum & Sipariş</Typography>} />
              </ListItemButton>
            </ListItem>
          )}
        </List>

        {['admin', 'super_admin'].includes(role || '') && (
          <>
            <Divider sx={{ my: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                <AdminPanelSettings sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                ADMIN
              </Typography>
            </Divider>
            <List dense>
              {adminLinks.map((l) => (
                <ListItem key={l.href} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={l.href}
                    selected={pathname.startsWith(l.href)}
                    onClick={variant === 'temporary' ? onMobileClose : undefined}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{l.icon}</ListItemIcon>
                    <ListItemText primary={l.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {user?.email}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'primary.main', textTransform: 'uppercase', fontWeight: 700 }}>
            {['admin', 'super_admin'].includes(role || '') ? 'Yönetici' : 'Müşteri'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={() => setProfileOpen(true)} title="Profil">
              <Person fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleLogout} title="Çıkış">
              <Logout fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </>
  );

  return (
    <>
      <Drawer
        variant={variant}
        open={variant === 'temporary' ? mobileOpen : undefined}
        onClose={variant === 'temporary' ? onMobileClose : undefined}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' },
          ...sx
        }}
      >
        {drawerContent}
      </Drawer>

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Profil</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {profileError && (
              <Typography variant="body2" color="error">
                {profileError}
              </Typography>
            )}
            <TextField
              label="Ad Soyad"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="ADEKS Üye No"
              value={adeksMemberNo}
              onChange={(e) => setAdeksMemberNo(e.target.value)}
              fullWidth
              size="small"
              placeholder="Opsiyonel"
            />
            <Button
              onClick={() => {
                setProfileOpen(false);
                setChangePasswordOpen(true);
              }}
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              Şifre Değiştir
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProfileOpen(false)} disabled={saving}>
            İptal
          </Button>
          <Button variant="contained" onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        email={user?.email}
      />
    </>
  );
}
