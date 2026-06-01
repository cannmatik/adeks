'use client';

import { Box, Container, Typography, Paper } from '@mui/material';
import { Check } from '@mui/icons-material';
import { CATEGORY_META, TableCategory } from '@/lib/categories';

const categories: TableCategory[] = ['SILVER', 'GOLD', 'PLATINUM', 'PLATINUM_PLUS', 'ELITE', 'STREAM_RENDER', 'GARDEN'];

const specs: Record<TableCategory, string[]> = {
  SILVER: ['İnternet ve Ofis İşlemleri', 'Orta Seviye Oyun Performansı', 'Standart Monitör'],
  GOLD: ['Fiyat / Performans', 'Yüksek Ayarlarda Oyun', '144Hz Monitör'],
  PLATINUM: ['240Hz Oyun Deneyimi', 'Competitive Gaming', 'RTX Ekran Kartı'],
  PLATINUM_PLUS: ['Üstün Performans', 'RTX 4070+', '240Hz Monitör'],
  ELITE: ['Şansa Bırakma', 'RTX 4090', 'En Yüksek Ayarlar'],
  STREAM_RENDER: ['Oyna, Yap, İş Yap', 'Streaming Setup', 'Render & Prodüksiyon'],
  GARDEN: ['Açık hava konforu', 'Yemek ve İçecek', 'Rahat ortam'],
};

export default function PricingSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, position: 'relative' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '0.2em', fontSize: 12 }}>
            FİYATLAR
          </Typography>
          <Typography variant="h2" sx={{ mt: 1, mb: 2, fontSize: { xs: 28, md: 40 } }}>
            Saatlik Ücretler
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 500, mx: 'auto' }}>
            Şeffaf fiyatlandırma, gizli maliyet yok
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isPopular = cat === 'PLATINUM' || cat === 'ELITE';
            return (
              <Paper
                key={cat}
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: isPopular ? `${meta.color}50` : 'divider',
                  bgcolor: isPopular ? `${meta.color}08` : 'background.paper',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    borderColor: `${meta.color}70`,
                    transform: 'translateY(-4px)',
                    boxShadow: `0 20px 40px ${meta.color}12`,
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {isPopular && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: -28,
                      bgcolor: meta.color,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      px: 6,
                      py: 0.5,
                      transform: 'rotate(45deg)',
                    }}
                  >
                    POPÜLER
                  </Box>
                )}
                <Typography variant="h6" sx={{ fontWeight: 700, color: meta.color, mb: 1 }}>
                  {meta.label}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, minHeight: 40 }}>
                  {meta.description}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, fontSize: '2.5rem' }}>
                    {meta.defaultRate}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', ml: 0.5 }}>
                    ₺/saat
                  </Typography>
                </Box>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                  {specs[cat].map((spec) => (
                    <Box
                      component="li"
                      key={spec}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 0.75,
                        color: 'text.secondary',
                        fontSize: 14,
                      }}
                    >
                      <Check sx={{ fontSize: 18, color: meta.color }} />
                      {spec}
                    </Box>
                  ))}
                </Box>
              </Paper>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
