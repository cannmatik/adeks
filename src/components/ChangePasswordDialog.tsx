'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  InputAdornment,
  Alert,
  Box,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import OtpDialog from './OtpDialog';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  email?: string;
}

export default function ChangePasswordDialog({ open, onClose, email }: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);

  const resetState = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const requestOtp = async () => {
    const res = await fetch('/api/auth/change-password/request-otp', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kod gönderilemedi');
  };

  const handleContinue = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor');
      return;
    }

    setSending(true);
    try {
      await requestOtp();
      setOtpOpen(true);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (otp: string) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Şifre güncellenemedi');
  };

  const handleOtpClose = (success: boolean) => {
    setOtpOpen(false);
    if (success) {
      resetState();
      onClose();
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <>
      <Dialog open={open && !otpOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Şifre Değiştir</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Yeni Şifre"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              size="small"
              slotProps={{
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
            <TextField
              label="Yeni Şifre Tekrarı"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={sending}>
            İptal
          </Button>
          <Button variant="contained" onClick={handleContinue} disabled={sending}>
            {sending ? 'Gönderiliyor...' : 'Kod Gönder'}
          </Button>
        </DialogActions>
      </Dialog>

      <OtpDialog
        open={otpOpen}
        onClose={handleOtpClose}
        email={email}
        onVerify={handleVerify}
        onResend={requestOtp}
        title="Şifre Değiştirme Onayı"
        description="E-postanıza gönderilen doğrulama kodunu girin."
        successMessage="Şifreniz güncellendi!"
      />
    </>
  );
}
