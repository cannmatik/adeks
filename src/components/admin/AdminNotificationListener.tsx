'use client';

import { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export default function AdminNotificationListener() {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [notification, setNotification] = useState<{ id: string; content: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-admin-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new;
          // Eğer mesajı admin kendisi göndermediyse bildirimi göster
          if (m.sender_id !== user.id) {
            setNotification({
              id: m.reservation_id, // Navigasyon için
              content: m.content || 'Yeni bir mesaj geldi.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const handleClose = () => {
    setNotification(null);
  };

  const handleAction = () => {
    setNotification(null);
    router.push('/admin/reservations'); // Tıklanınca rezervasyonlar sayfasına git
  };

  return (
    <Snackbar
      open={!!notification}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={handleClose}
        severity="info"
        variant="filled"
        sx={{ width: '100%', cursor: 'pointer' }}
        onClick={handleAction}
      >
        <strong>Yeni Rezervasyon Mesajı:</strong><br/>
        {notification?.content}
      </Alert>
    </Snackbar>
  );
}
