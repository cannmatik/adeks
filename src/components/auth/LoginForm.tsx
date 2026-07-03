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
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

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

    setLoading(false);
    router.push('/dashboard');
    router.refresh();
  };

  const shrinkProps = { inputLabel: { shrink: true } };

  return (
    <form onSubmit={handleLogin}>
      <Fade in={!!error}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      </Fade>

      <TextField
        fullWidth
        label="E-posta"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={shrinkProps}
      />

      <TextField
        fullWidth
        label="Şifre"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 1 }}
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

      {onForgotPassword && (
        <Box sx={{ textAlign: 'right', mb: 2 }}>
          <Button onClick={onForgotPassword} size="small" sx={{ textTransform: 'none' }}>
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
        sx={[
          {
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
            py: 1.5,
            '&:hover': {
              bgcolor: 'primary.main',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            },
          },
          (theme) =>
            theme.applyStyles('dark', {
              '&:hover': {
                boxShadow: '0 4px 16px rgba(255,255,255,0.08)',
              },
            }),
        ]}
      >
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button onClick={onSwitchToRegister} sx={{ textTransform: 'none' }}>
          Hesabınız yok mu? Kayıt olun
        </Button>
      </Box>
    </form>
  );
}
