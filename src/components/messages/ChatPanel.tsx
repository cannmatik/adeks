'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, TextField, IconButton, Typography, CircularProgress, Alert, Paper, Stack, Chip, Collapse, Button } from '@mui/material';
import { Send } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import ReservationDetails from '@/components/admin/ReservationDetails';
import { RESERVATION_COLOR, RESERVATION_LABEL, ReservationStatus } from '@/lib/categories';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  is_read: boolean;
  content: string;
  created_at: string;
}

interface Props {
  reservationId: string;
  header?: React.ReactNode;
}

export default function ChatPanel({ reservationId, header }: Props) {
  const { user, role } = useAuth();
  const supabase = createClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [reservation, setReservation] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const reservationStatus = reservation?.status as ReservationStatus | undefined;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?reservationId=${reservationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setConversationId(data.conversationId);
      setMessages(data.messages);
      setReservation(data.reservation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reservationId]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as MessageRow;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || !conversationId || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gönderilemedi');
      }
      setContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 400,
        bgcolor: 'background.paper',
        backgroundImage: 'none',
      }}
    >
      {header}

      {reservation && (
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, m: { xs: 1, sm: 2 }, mb: 0, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, minWidth: 0, wordBreak: 'break-word' }}>
              Kişi: {reservation.owner?.full_name || 'Bilinmiyor'} {reservation.owner?.email ? `(${reservation.owner.email})` : ''}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Chip
                size="small"
                label={reservationStatus ? RESERVATION_LABEL[reservationStatus] : reservation.status}
                color={reservationStatus ? RESERVATION_COLOR[reservationStatus] : 'default'}
              />
              <Button size="small" variant="outlined" color="inherit" onClick={() => setDetailsOpen(!detailsOpen)}>
                {detailsOpen ? 'Gizle' : 'Detaylar'}
              </Button>
            </Stack>
          </Stack>

          <Collapse in={detailsOpen}>
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
              <ReservationDetails reservation={reservation} isAdmin={['admin', 'super_admin'].includes(role)} />
            </Box>
          </Collapse>
        </Paper>
      )}

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ m: 2 }}>{error}</Alert>}

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : messages.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
            Henüz mesaj yok. İlk mesajı sen yaz!
          </Typography>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <Box
                key={m.id}
                sx={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: { xs: '85%', sm: '75%' },
                  bgcolor: mine ? 'primary.main' : 'background.default',
                  color: mine ? 'primary.contrastText' : 'text.primary',
                  border: mine ? 0 : 1,
                  borderColor: 'divider',
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.content}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5, fontSize: 10 }}>
                  {new Date(m.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>

      <Box
        component="form"
        onSubmit={handleSend}
        sx={{
          p: 1.5,
          pb: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Mesajınızı yazın..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending || !conversationId}
          slotProps={{ inputLabel: { shrink: false } }}
        />
        <IconButton type="submit" color="primary" disabled={sending || !content.trim()}>
          <Send />
        </IconButton>
      </Box>
    </Paper>
  );
}
