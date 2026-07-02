'use client';

import { Box, Typography } from '@mui/material';

export default function ReservationsPageHeader() {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h4"
        sx={{
          mb: 0.5,
          fontSize: { xs: '1.5rem', md: '2.125rem' },
          fontWeight: 800,
          color: 'text.primary',
        }}
      >
        Rezervasyonlarım
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Tüm rezervasyon taleplerin ve durumları.
      </Typography>
    </Box>
  );
}
