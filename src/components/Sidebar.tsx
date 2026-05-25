'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from '@mui/icons-material';
import { useAuth } from './AuthProvider';
import { createClient } from '@/lib/supabase/client';

const DRAWER_WIDTH = 240;

const customerLinks = [
  { href: '/dashboard', label: 'Masalar', icon: <DashboardIcon /> },
  { href: '/reservations', label: 'Rezervasyonlarım', icon: <EventSeat /> },
  { href: '/messages', label: 'Mesajlar', icon: <Chat /> },
];

const adminLinks = [
  { href: '/admin/sessions', label: 'Anlık Durum', icon: <Bolt /> },
  { href: '/admin/floor-plan', label: 'Salon Düzeni', icon: <Map /> },
  { href: '/admin/tables', label: 'Masa Yönetimi', icon: <TableRestaurant /> },
  { href: '/admin/reservations', label: 'Rezervasyonlar', icon: <EventAvailable /> },
  { href: '/admin/messages', label: 'Tüm Mesajlar', icon: <Chat /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user } = useAuth();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' },
      }}
    >
      <Toolbar sx={{ px: 2, gap: 1.5 }}>
        <SportsEsports sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
          ADEKS
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
        <List dense>
          {customerLinks.map((l) => (
            <ListItem key={l.href} disablePadding>
              <ListItemButton
                component={Link}
                href={l.href}
                selected={pathname === l.href || pathname.startsWith(l.href + '/')}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{l.icon}</ListItemIcon>
                <ListItemText primary={l.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {role === 'admin' && (
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
            {role === 'admin' ? 'Yönetici' : 'Müşteri'}
          </Typography>
          <IconButton size="small" onClick={handleLogout} title="Çıkış">
            <Logout fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
}
