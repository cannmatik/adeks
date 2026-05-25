'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { createClient } from '@/lib/supabase/client';
import ChatPanel from '@/components/messages/ChatPanel';

interface ConvRow {
  id: string;
  user_id: string;
  last_message_at: string;
  user: { full_name: string | null; email: string | null } | null;
}

export default function AdminMessagesPage() {
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('id, user_id, last_message_at, user:profiles(full_name, email)')
      .order('last_message_at', { ascending: false });
    if (error) setError(error.message);
    else {
      const list = (data as unknown as ConvRow[]) ?? [];
      setConversations(list);
      if (!selected && list[0]) setSelected(list[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Tüm Mesajlar</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Müşteri konuşmalarına anlık olarak cevap ver.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
        <Paper sx={{ width: { xs: '100%', md: 320 }, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : conversations.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Henüz konuşma yok.
              </Typography>
            </Box>
          ) : (
            <List dense>
              {conversations.map((c) => (
                <ListItem key={c.id} disablePadding>
                  <ListItemButton selected={selected === c.id} onClick={() => setSelected(c.id)}>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {c.user?.full_name || 'Kullanıcı'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {c.user?.email}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {new Date(c.last_message_at).toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <ChatPanel conversationId={selected} />
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              Sol panelden bir konuşma seç.
            </Paper>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
