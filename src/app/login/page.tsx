'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import OtpDialog from '@/components/OtpDialog';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard');
    });
  }, [router, supabase]);

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPassword, setOtpPassword] = useState('');

  const handleRegisterSuccess = (email: string, password: string) => {
    setOtpEmail(email);
    setOtpPassword(password);
    setShowOtpDialog(true);
  };

  const handleVerifyOtp = async (otp: string) => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, otp }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Geçersiz kod');
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: otpEmail,
      password: otpPassword,
    });

    if (signInError) {
      throw new Error(signInError.message);
    }
  };

  const handleResendOtp = async (emailToResend?: string) => {
    const emailTarget = typeof emailToResend === 'string' ? emailToResend : otpEmail;
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailTarget }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Kod gönderilemedi');
    }
  };

  const handleUnverifiedEmail = async (email: string, password: string) => {
    setOtpEmail(email);
    setOtpPassword(password);
    setShowOtpDialog(true);
    try {
      await handleResendOtp(email);
    } catch (err: any) {
      console.error("Resend error on login:", err);
    }
  };

  const handleOtpClose = (success: boolean) => {
    setShowOtpDialog(false);
    if (success) {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <AuthLayout>
      {mode === 'login' ? (
        <LoginForm
          onSwitchToRegister={() => setMode('register')}
          onUnverifiedEmail={handleUnverifiedEmail}
          onForgotPassword={() => setMode('forgot')}
        />
      ) : mode === 'register' ? (
        <RegisterForm
          onSwitchToLogin={() => setMode('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      ) : (
        <ForgotPasswordForm onSwitchToLogin={() => setMode('login')} />
      )}

      <OtpDialog
        open={showOtpDialog}
        onClose={handleOtpClose}
        email={otpEmail}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        title="E-posta Doğrulama"
        description="E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin."
        successMessage="E-posta doğrulandı! Yönlendiriliyorsunuz..."
      />
    </AuthLayout>
  );
}
