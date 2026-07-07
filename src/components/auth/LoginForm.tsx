'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Fade,
  Box,
  Backdrop,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onUnverifiedEmail?: (email: string, password: string) => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSwitchToRegister, onUnverifiedEmail, onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!email || !password) {
      setError('E-posta ve şifre gereklidir');
      return;
    }
    setLoading(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.user) {
      setLoading(false);
      
      if (signInError?.message === 'Email not confirmed' && onUnverifiedEmail) {
        onUnverifiedEmail(email, password);
        return;
      }
      
      setError(
        signInError?.message === 'Invalid login credentials'
          ? 'E-posta veya şifre hatalı'
          : signInError?.message ?? 'Giriş başarısız',
      );
      return;
    }

    // Don't set loading to false here so the overlay stays until redirect finishes
    router.push('/dashboard');
    router.refresh();
  };

  const shrinkProps = { inputLabel: { shrink: true } };

  return (
    <>
      <Backdrop
        sx={(theme) => ({
          color: '#fff',
          zIndex: theme.zIndex.drawer + 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        })}
        open={loading}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Giriş Yapılıyor...
        </Typography>
      </Backdrop>

      <form onSubmit={handleLogin}>
        <Fade in={!!error}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        </Fade>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            slotProps={shrinkProps}
            placeholder="ornek@email.com"
          />

          <TextField
            fullWidth
            label="Şifre"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'text.secondary' }}
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {onForgotPassword && (
          <Box sx={{ textAlign: 'right', mt: 0.5, mb: 1 }}>
            <Button 
              onClick={onForgotPassword} 
              size="small" 
              sx={{ 
                textTransform: 'none', 
                fontSize: '0.8rem',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              Şifremi unuttum?
            </Button>
          </Box>
        )}

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          startIcon={!loading ? <LoginIcon /> : undefined}
          sx={{
            mt: 1,
            py: 1.5,
            fontSize: '0.95rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #E11D2A 0%, #C41822 100%)',
            boxShadow: '0 4px 16px rgba(225,29,42,0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: 'linear-gradient(135deg, #FF4C58 0%, #E11D2A 100%)',
              boxShadow: '0 6px 24px rgba(225,29,42,0.45)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0) scale(0.99)',
            },
          }}
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </Button>

        <Divider sx={{ my: 2.5, fontSize: '0.75rem', color: 'text.disabled' }}>veya</Divider>

        <Button 
          onClick={onSwitchToRegister} 
          fullWidth
          variant="outlined"
          sx={{ 
            textTransform: 'none',
            py: 1.2,
            fontWeight: 600,
            borderRadius: 2,
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              bgcolor: 'rgba(225,29,42,0.04)',
            },
          }}
        >
          Hesabınız yok mu? Kayıt olun
        </Button>
      </form>
    </>
  );
}
