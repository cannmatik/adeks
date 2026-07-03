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
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import OtpDialog from '../OtpDialog';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export default function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);

  const requestOtp = async () => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kod gönderilemedi');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!email || !newPassword || !confirmPassword) {
      setError('E-posta ve yeni şifre zorunludur');
      return;
    }
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor');
      return;
    }

    setLoading(true);
    try {
      await requestOtp();
      setOtpOpen(true);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otp: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Şifre güncellenemedi');
  };

  const handleOtpClose = (success: boolean) => {
    setOtpOpen(false);
    if (success) onSwitchToLogin();
  };

  const shrinkProps = { inputLabel: { shrink: true } };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Fade in={!!error}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        </Fade>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          E-posta adresinizi ve yeni şifrenizi girin, onay kodu e-postanıza gönderilsin.
        </Typography>

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
          label="Yeni Şifre"
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          sx={{ mb: 2 }}
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
          fullWidth
          label="Yeni Şifre Tekrarı"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          sx={{ mb: 3 }}
          slotProps={shrinkProps}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
        </Button>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button onClick={onSwitchToLogin} sx={{ textTransform: 'none' }}>
            Girişe dön
          </Button>
        </Box>
      </form>

      <OtpDialog
        open={otpOpen}
        onClose={handleOtpClose}
        email={email}
        onVerify={handleVerify}
        onResend={requestOtp}
        title="Şifre Sıfırlama"
        description="E-postanıza gönderilen 6 haneli doğrulama kodunu girin."
        successMessage="Şifreniz güncellendi! Giriş yapabilirsiniz."
      />
    </>
  );
}
