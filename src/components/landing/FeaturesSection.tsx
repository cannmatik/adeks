'use client';

import { Box, Card, CardContent, Container, Typography } from '@mui/material';
import { EventSeat, Chat, Shield, Restaurant, Gamepad, Speed } from '@mui/icons-material';

const features = [
  {
    icon: <EventSeat />,
    title: 'Anında Rezervasyon',
    body: 'Müsait masaları gör, tarih ve saat seç, talebini gönder. Admin onayıyla masan hazır.',
  },
  {
    icon: <Chat />,
    title: 'Canlı Mesajlaşma',
    body: 'Soru sor, özel istek bildir; kafe ekibi anlık olarak cevaplar. Rezervasyon öncesi danışmanlık.',
  },
  {
    icon: <Shield />,
    title: 'OTP Güvenli Kayıt',
    body: 'E-posta + 6 haneli kodla doğrulamalı kayıt. Şifreni biz tutmuyoruz, güvenliğin önde.',
  },
  {
    icon: <Restaurant />,
    title: 'Önceden Yemek Siparişi',
    body: 'Rezervasyon yaparken menüden seç, gelmeden önce hazır olsun. Burger, makarna, içecek...',
  },
  {
    icon: <Gamepad />,
    title: '6 Farklı Kategori',
    body: 'Silver’dan Stream Render’a. Her bütçeye ve oyun tarzına uygun istasyonlar.',
  },
  {
    icon: <Speed />,
    title: 'Yüksek Performans',
    body: 'RTX 4090, 240Hz monitörler, fiber internet. Competitive gaming için ideal ortam.',
  },
];

export default function FeaturesSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '0.2em', fontSize: 12 }}>
            ÖZELLİKLER
          </Typography>
          <Typography variant="h2" sx={{ mt: 1, mb: 2, fontSize: { xs: 28, md: 40 } }}>
            Neden ADEKS?
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {features.map((f) => (
            <Card key={f.title} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    bgcolor: 'rgba(225,29,42,0.1)',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    '& svg': { fontSize: 24 },
                  }}
                >
                  {f.icon}
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {f.body}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
