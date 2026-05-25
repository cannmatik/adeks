'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Paper, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import { Send } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Props {
  conversationId?: string | null;
  header?: React.ReactNode;
}

export default function ChatPanel({ conversationId: forcedId, header }: Props) {
  const { user } = useAuth();
  const supabase = createClient();
  const [conversationId, setConversationId] = useState<string | null>(forcedId ?? null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async (id?: string | null) => {
    setLoading(true);
    try {
      const url = id ? `/api/messages?conversationId=${id}` : '/api/messages';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi');
      setConversationId(data.conversationId);
      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(forcedId ?? undefined);
  }, [forcedId]);

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
        body: JSON.stringify({ conversationId, content }),
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
    <Paper sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
      {header}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ m: 2 }}>{error}</Alert>}

      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                  maxWidth: '75%',
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

      <Box component="form" onSubmit={handleSend} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
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
