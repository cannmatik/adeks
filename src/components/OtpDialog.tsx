'use client';

import { useState, useEffect, ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OTPInput from './OTPInput';

interface OtpDialogProps {
  open: boolean;
  onClose: (success: boolean) => void;
  email?: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  title?: string;
  description?: string;
  successMessage?: string;
  length?: number;
  initialCountdown?: number;
  children?: ReactNode;
}

export default function OtpDialog({
  open,
  onClose,
  email,
  onVerify,
  onResend,
  title = 'Doğrulama Kodu',
  description = 'E-posta adresinize gönderilen doğrulama kodunu girin.',
  successMessage = 'Doğrulama başarılı!',
  length = 6,
  initialCountdown = 0,
  children,
}: OtpDialogProps) {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (open) {
      setOtp('');
      setError('');
      setSuccess(false);
      if (initialCountdown > 0) {
        setCountdown(initialCountdown);
      }
    }
  }, [open, initialCountdown]);

  const handleVerify = async (value?: string) => {
    const code = value || otp;
    if (!code || code.length !== length) return;

    setVerifying(true);
    setError('');

    try {
      await onVerify(code);
      setSuccess(true);
      setTimeout(() => {
        onClose(true);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Doğrulama başarısız');
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || countdown > 0) return;

    setResending(true);
    setError('');
    try {
      await onResend();
      setCountdown(120);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('bekleyin') || err.message?.toLowerCase().includes('saniye')) {
        setCountdown(120);
      }
      setError(err.message || 'Kod gönderilemedi');
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !verifying && !success && onClose(false)}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {!verifying && !success && (
          <IconButton size="small" onClick={() => onClose(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        {!success ? (
          <>
            <DialogContentText sx={{ mb: 3 }}>
              {description}
              {email && (
                <Box component="span" sx={{ display: 'block', mt: 0.5, fontWeight: 600, color: 'text.primary' }}>
                  {email}
                </Box>
              )}
            </DialogContentText>

            {children}

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <OTPInput
                length={length}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerify}
                disabled={verifying || success}
                error={!!error}
              />
            </Box>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                size="small"
                onClick={handleResend}
                disabled={resending || verifying || countdown > 0}
                sx={{ textTransform: 'none' }}
              >
                {resending
                  ? 'Gönderiliyor...'
                  : countdown > 0
                  ? `Tekrar gönder: ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
                  : 'Kod gelmedi mi? Tekrar gönder'}
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2, color: 'success.main' }} variant="determinate" value={100} />
            <Typography sx={{ color: 'success.main', fontWeight: 600, typography: 'h6' }}>
              {successMessage}
            </Typography>
          </Box>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => handleVerify(otp)}
            disabled={verifying || otp.length !== length}
            sx={{ py: 1.2, fontWeight: 700, borderRadius: 2 }}
          >
            {verifying ? <CircularProgress size={24} color="inherit" /> : 'Doğrula'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
