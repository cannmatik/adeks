'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Fade,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { AdminPanelSettings, Visibility, VisibilityOff } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile?.role === 'admin') {
        router.push('/admin/reservations');
      }
    });
  }, [router, supabase]);

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
      setError(
        signInError?.message === 'Invalid login credentials'
          ? 'E-posta veya şifre hatalı'
          : signInError?.message ?? 'Giriş başarısız',
      );
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', signInData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setLoading(false);
      setError('Bu hesap admin yetkisine sahip değil.');
      return;
    }

    setLoading(false);
    router.push('/admin/reservations');
    router.refresh();
  };

  const shrinkProps = { inputLabel: { shrink: true } };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(201,162,39,0.06) 0%, transparent 60%)',
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, p: 2 }}>
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
                  borderColor: 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <AdminPanelSettings sx={{ color: 'secondary.main', fontSize: 32 }} />
              </Box>
              <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 700, letterSpacing: '0.1em' }}>
                ADEKS Yönetici
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Sadece kafe personeli içindir
              </Typography>
            </Box>

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
                sx={{ mb: 3 }}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Giriş yapılıyor...' : 'Yönetici Girişi'}
              </Button>
            </form>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button href="/login" sx={{ textTransform: 'none' }}>
                ← Müşteri girişi
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
