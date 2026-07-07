'use client';

import { Box, Card, CardContent, Typography, Skeleton } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';
import ThemeToggle from '../ThemeToggle';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [settings, setSettings] = useState<{login_text: string, footer_text: string} | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (active && !data.error) setSettings(data);
      })
      .catch(err => console.error(err));
    return () => { active = false; };
  }, []);

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
      {/* Animated gradient background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse at 20% 50%, rgba(225,29,42,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(225,29,42,0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(139,15,24,0.03) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 20% 50%, rgba(225,29,42,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(225,29,42,0.03) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(0,0,0,0.02) 0%, transparent 50%)',
          animation: 'bgPulse 8s ease-in-out infinite alternate',
        }}
      />

      {/* Subtle grid pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: (theme) => theme.palette.mode === 'dark' ? 0.03 : 0.04,
          backgroundImage: 'linear-gradient(rgba(225,29,42,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(225,29,42,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440, p: 2 }}>
        <Card
          sx={{
            overflow: 'visible',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -1,
              left: '10%',
              right: '10%',
              height: 3,
              borderRadius: '0 0 8px 8px',
              background: 'linear-gradient(90deg, transparent, #E11D2A, transparent)',
            },
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
              <ThemeToggle />
            </Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={(theme) => ({
                  bgcolor: '#000',
                  ...theme.applyStyles('dark', { bgcolor: 'rgba(255,255,255,0.05)' }),
                  borderRadius: 2.5,
                  p: 2,
                  px: 3,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.03)',
                    boxShadow: '0 8px 32px rgba(225,29,42,0.15)',
                  },
                })}
              >
                <img src="/adeks.png" alt="ADEKS" style={{ height: 48, objectFit: 'contain' }} />
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary', 
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em',
                }}
              >
                {settings ? settings.login_text : <Skeleton width={180} sx={{ display: 'inline-block' }} />}
              </Typography>
            </Box>

            {children}

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.disabled',
                  fontSize: '0.7rem',
                  letterSpacing: '0.05em',
                }}
              >
                {settings ? settings.footer_text : <Skeleton width={200} sx={{ display: 'inline-block' }} />}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <style>{`
        @keyframes bgPulse {
          0% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </Box>
  );
}
