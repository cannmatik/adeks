'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import { SportsEsports } from '@mui/icons-material';
import { ReactNode } from 'react';
import ThemeToggle from '../ThemeToggle';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(0,212,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(201,162,39,0.04) 0%, transparent 50%)',
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, p: 2 }}>
        <Card>
          <CardContent sx={{ p: 4, position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
              <ThemeToggle />
            </Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: 2,
                  borderColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <SportsEsports sx={{ color: 'primary.main', fontSize: 32 }} />
              </Box>
              <Typography variant="h4" sx={{ mb: 0.5, fontFamily: '"Montserrat",sans-serif', fontWeight: 700, letterSpacing: '0.1em' }}>
                ADEKS
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                İnternet Kafe — masa rezervasyonu ve canlı destek
              </Typography>
            </Box>

            {children}

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Güvenli e-posta doğrulama · Hızlı rezervasyon · Canlı mesajlaşma
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
