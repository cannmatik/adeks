'use client';

import { Box, Button, Typography } from '@mui/material';
import { Add, EventNote } from '@mui/icons-material';

export default function ReservationsEmptyState() {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 3,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <EventNote sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
        Henüz rezervasyonun yok
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3, maxWidth: 340, mx: 'auto' }}>
        Masalar sayfasından istediğin masayı seçip hemen bir rezervasyon oluşturabilirsin.
      </Typography>
      <Button variant="contained" color="primary" startIcon={<Add />} href="/dashboard" sx={{ px: 3 }}>
        Yeni Rezervasyon Oluştur
      </Button>
    </Box>
  );
}
