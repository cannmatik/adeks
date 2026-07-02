'use client';

import { useEffect, useState } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import ChatPanel from '@/components/messages/ChatPanel';

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    
    // First beep
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    
    // Second beep
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    
    setTimeout(() => {
      ctx.close();
    }, 300);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export default function AdminNotificationListener() {
  const { user } = useAuth();
  const supabase = createClient();

  const [notification, setNotification] = useState<{ id: string; content: string; title: string } | null>(null);
  const [chatReservationId, setChatReservationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-admin-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new;
          if (m.sender_id !== user.id) {
            supabase.from('conversations').select('reservation_id').eq('id', m.conversation_id).single().then(async ({ data: convData }) => {
              if (convData) {
                const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', m.sender_id).single();
                const name = profile?.full_name || profile?.email || 'Müşteri';
                setNotification({
                  id: convData.reservation_id,
                  title: `${name}`,
                  content: m.content || 'Yeni bir mesaj geldi.',
                });
                playNotificationSound();
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations' },
        async (payload) => {
          const r = payload.new;
          let name = 'Bilinmeyen Kullanıcı';
          if (r.user_id) {
             const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', r.user_id).single();
             if (profile) {
                name = profile.full_name || profile.email || name;
             }
          }
          const phoneText = r.contact_phone ? `\nTelefon: ${r.contact_phone}` : '';
          setNotification({
            id: r.id,
            title: `Yeni Rezervasyon: ${name}`,
            content: `Yeni bir rezervasyon talebi geldi.${phoneText}`,
          });
          playNotificationSound();
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
    if (notification?.id) {
      setChatReservationId(notification.id);
    }
    setNotification(null);
  };

  return (
    <>
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
        <strong>{notification?.title || 'Yeni Mesaj'}</strong><br/>
        {notification?.content}
      </Alert>
    </Snackbar>

    <Dialog
      open={!!chatReservationId}
      onClose={() => setChatReservationId(null)}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { height: '70vh' } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>Rezervasyon Mesajları</DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {chatReservationId && <ChatPanel reservationId={chatReservationId} />}
      </DialogContent>
    </Dialog>
    </>
  );
}
