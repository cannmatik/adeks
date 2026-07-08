'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Masalar',
  '/reservations': 'Rezervasyonlarım',
  '/messages': 'Mesajlar',
  '/admin/sessions': 'Anlık Durum',
  '/admin/floor-plan': 'Salon Düzeni',
  '/admin/sections': 'Bölüm / Masa Yönetimi',
  '/admin/categories': 'Kategori Yönetimi',
  '/admin/reservations': 'Rezervasyonlar',
  '/admin/messages': 'Tüm Mesajlar',
  '/admin/settings': 'Kafe Ayarları',
};

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Try prefix match for nested routes
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path + '/')) return title;
  }
  return 'ADEKS';
}

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = title || getTitle(pathname);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Temporary drawer for all screen sizes */}
      <Sidebar
        variant="temporary"
        mobileOpen={mobileOpen}
        onMobileClose={handleDrawerClose}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="default"
          sx={{
            bgcolor: 'background.default',
            borderBottom: 1,
            borderColor: 'divider',
            width: '100%',
            ml: 0,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {pageTitle}
              </Typography>
            </Box>
            <ThemeToggle />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
