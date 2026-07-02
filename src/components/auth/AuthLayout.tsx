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
                sx={(theme) => ({
                  bgcolor: '#000',
                  ...theme.applyStyles('dark', { bgcolor: 'transparent' }),
                  borderRadius: 2,
                  p: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                })}
              >
                <img src="/adeks.png" alt="ADEKS" style={{ height: 48, objectFit: 'contain' }} />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Çalışma Saatleri: 07:30 - 02:00
              </Typography>
            </Box>

            {children}

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Adeks İnternet Kafe Online Rezervasyon
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
