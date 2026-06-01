'use client';

import { useState } from 'react';
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

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegisterSuccess: (email: string, password: string) => void;
}

export default function RegisterForm({ onSwitchToLogin, onRegisterSuccess }: RegisterFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adeksMemberNo, setAdeksMemberNo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!email || !password || !fullName) {
      setError('Ad soyad, e-posta ve şifre zorunludur');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, adeksMemberNo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kayıt başarısız');
        setLoading(false);
        return;
      }

      onRegisterSuccess(email, password);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const shrinkProps = { inputLabel: { shrink: true } };

  return (
    <>
      <Fade in={!!error}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      </Fade>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <TextField
          label="Ad Soyad"
          fullWidth
          size="small"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          slotProps={shrinkProps}
        />
        <TextField
          label="E-posta"
          type="email"
          fullWidth
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          slotProps={shrinkProps}
        />
        <TextField
          label="ADEKS Üye No (opsiyonel)"
          fullWidth
          size="small"
          value={adeksMemberNo}
          onChange={(e) => setAdeksMemberNo(e.target.value)}
          slotProps={shrinkProps}
        />
        <TextField
          label="Şifre"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={handleRegister}
        disabled={loading}
        sx={{ mt: 2, py: 1.5 }}
      >
        {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button onClick={onSwitchToLogin} sx={{ textTransform: 'none' }}>
          Zaten hesabınız var mı? Giriş yapın
        </Button>
      </Box>
    </>
  );
}
