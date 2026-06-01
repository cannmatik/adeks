'use client';

import { useState } from 'react';
import { AppBar, Box, Button, Container, IconButton, Toolbar, Typography, useScrollTrigger } from '@mui/material';
import { Menu as MenuIcon, Close, SportsEsports } from '@mui/icons-material';
import ThemeToggle from '@/components/ThemeToggle';

const navLinks = [
  { label: 'Ana Sayfa', href: '/' },
  { label: 'Menü', href: '/menu' },
  { label: 'Rezervasyon', href: '/login' },
];

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 50 });

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: scrolled ? 'rgba(10,10,11,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        boxShadow: 'none',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar sx={{ px: { xs: 0 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <SportsEsports sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.15em',
                fontSize: 20,
                background: 'linear-gradient(135deg, #F5F5F7 0%, #E11D2A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ADEKS
            </Typography>
          </Box>

          {/* Desktop nav */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
            {navLinks.map((link) => (
              <Button
                key={link.label}
                href={link.href}
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: 14,
                  px: 2,
                  '&:hover': { color: 'primary.light' },
                }}
              >
                {link.label}
              </Button>
            ))}
            <ThemeToggle />
            <Button
              href="/login"
              variant="contained"
              size="small"
              sx={{ ml: 1, px: 3, py: 0.8 }}
            >
              Giriş Yap
            </Button>
          </Box>

          {/* Mobile toggle */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <ThemeToggle />
            <IconButton onClick={() => setMobileOpen(!mobileOpen)} sx={{ color: 'text.primary' }}>
              {mobileOpen ? <Close /> : <MenuIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile menu */}
      {mobileOpen && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            px: 3,
            pb: 3,
            backgroundColor: 'rgba(10,10,11,0.95)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {navLinks.map((link) => (
            <Button
              key={link.label}
              href={link.href}
              fullWidth
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                justifyContent: 'flex-start',
                py: 1.5,
                '&:hover': { color: 'primary.light' },
              }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Button>
          ))}
          <Button
            href="/login"
            variant="contained"
            fullWidth
            sx={{ mt: 1 }}
            onClick={() => setMobileOpen(false)}
          >
            Giriş Yap
          </Button>
        </Box>
      )}
    </AppBar>
  );
}
