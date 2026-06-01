'use client';

import { Box, Card, CardContent, Container, Typography } from '@mui/material';
import { CATEGORY_META, TableCategory } from '@/lib/categories';

const categories: TableCategory[] = ['SILVER', 'GOLD', 'PLATINUM', 'PLATINUM_PLUS', 'ELITE', 'STREAM_RENDER'];

export default function CategoryGrid() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '0.2em', fontSize: 12 }}>
            KATEGORİLER
          </Typography>
          <Typography variant="h2" sx={{ mt: 1, mb: 2, fontSize: { xs: 28, md: 40 } }}>
            İhtiyacına Göre Seç
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 500, mx: 'auto' }}>
            Her bütçeye ve her oyun tarzına uygun istasyonlar
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <Card
                key={cat}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderColor: `${meta.color}22`,
                  '&:hover': {
                    borderColor: `${meta.color}66`,
                    transform: 'translateY(-4px)',
                    boxShadow: `0 20px 40px ${meta.color}15`,
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Glow line at top */}
                <Box
                  sx={{
                    height: 3,
                    width: '100%',
                    background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
                    opacity: 0.6,
                  }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 20,
                        color: meta.color,
                        bgcolor: `${meta.color}15`,
                        border: `1.5px solid ${meta.color}30`,
                      }}
                    >
                      {meta.short}
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        color: meta.color,
                        textShadow: `0 0 20px ${meta.color}40`,
                      }}
                    >
                      {meta.defaultRate}₺
                      <Typography component="span" variant="caption" sx={{ color: 'text.disabled', ml: 0.5, fontWeight: 500 }}>
                        /saat
                      </Typography>
                    </Typography>
                  </Box>

                  <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>
                    {meta.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {meta.description}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
