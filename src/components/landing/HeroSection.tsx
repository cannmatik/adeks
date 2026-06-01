'use client';

import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Bolt, KeyboardArrowDown } from '@mui/icons-material';

export default function HeroSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pt: 8,
      }}
    >
      {/* Background effects */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(225,29,42,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(225,29,42,0.06) 0%, transparent 40%)',
          pointerEvents: 'none',
        }}
      />
      {/* Grid pattern overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 70%)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Typography
          variant="overline"
          sx={{
            color: 'primary.main',
            letterSpacing: '0.25em',
            fontSize: 13,
            mb: 3,
            display: 'block',
          }}
        >
          İSTANBUL&apos;UN EN İYİ GAMING CAFE&apos;Sİ
        </Typography>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.8rem', sm: '4rem', md: '5.5rem' },
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            mb: 3,
            background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Geleceğin
          <br />
          <Box component="span" sx={{ color: 'primary.main', WebkitTextFillColor: '#E11D2A' }}>
            Oyun Deneyimi
          </Box>
        </Typography>

        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            maxWidth: 560,
            mx: 'auto',
            mb: 5,
            fontWeight: 400,
            fontSize: { xs: 16, md: 18 },
            lineHeight: 1.7,
          }}
        >
          Silver&apos;dan Stream Render&apos;a kadar 6 kategori. 240Hz monitörler, RTX 4090,
          profesyonel streaming setup&apos;ları. Masanı seç, oyuna başla.
        </Typography>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'center', mb: 8 }}
        >
          <Button
            href="/login"
            variant="contained"
            size="large"
            startIcon={<Bolt />}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: 16,
              borderRadius: 10,
            }}
          >
            Hemen Rezerve Et
          </Button>
          <Button
            href="/menu"
            variant="outlined"
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              fontSize: 16,
              borderRadius: 10,
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'text.secondary',
              '&:hover': { borderColor: 'primary.main', color: 'primary.light' },
            }}
          >
            Menüyü Gör
          </Button>
        </Stack>

        {/* Scroll indicator */}
        <Box sx={{ animation: 'bounce 2s infinite', '@keyframes bounce': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(10px)' } } }}>
          <KeyboardArrowDown sx={{ color: 'text.disabled', fontSize: 32 }} />
        </Box>
      </Container>
    </Box>
  );
}
