'use client';

import { Box, Typography } from '@mui/material';
import ChatPanel from '@/components/messages/ChatPanel';

export default function MessagesPage() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>Kafe ile Mesajlaş</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Soru sor, özel istek bildir veya rezervasyon durumunu sor. Canlı cevap alacaksın.
      </Typography>
      <ChatPanel />
    </Box>
  );
}
