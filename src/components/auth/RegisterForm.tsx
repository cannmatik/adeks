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
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegisterSuccess: (email: string, password: string) => void;
}

export default function RegisterForm({ onSwitchToLogin, onRegisterSuccess }: RegisterFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adeksMemberNo, setAdeksMemberNo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    
    if (!email || !password || !confirmPassword || !fullName) {
      setError('Ad soyad, e-posta, şifre ve şifre tekrarı zorunludur');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor');
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
    <form onSubmit={handleRegister}>
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
          placeholder="Adınız Soyadınız"
        />
        <TextField
          label="E-posta"
          type="email"
          fullWidth
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          slotProps={shrinkProps}
          placeholder="ornek@email.com"
        />
        <TextField
          label="ADEKS Üye No (opsiyonel)"
          fullWidth
          size="small"
          value={adeksMemberNo}
          onChange={(e) => setAdeksMemberNo(e.target.value)}
          slotProps={shrinkProps}
          placeholder="Varsa üye numaranız"
        />
        <TextField
          label="Şifre"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="En az 6 karakter"
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
        <TextField
          label="Şifre Tekrarı"
          type={showConfirmPassword ? 'text' : 'password'}
          fullWidth
          size="small"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Şifrenizi tekrar girin"
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    sx={{ color: 'text.secondary' }}
                  >
                    {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        startIcon={!loading ? <PersonAdd /> : undefined}
        sx={{ 
          mt: 2.5, 
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
        {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
      </Button>

      <Divider sx={{ my: 2.5, fontSize: '0.75rem', color: 'text.disabled' }}>veya</Divider>

      <Button 
        onClick={onSwitchToLogin}
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
        Zaten hesabınız var mı? Giriş yapın
      </Button>
    </form>
  );
}
