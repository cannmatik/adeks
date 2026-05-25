import { Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { SportsEsports, EventSeat, Chat, Bolt } from '@mui/icons-material';
import { CATEGORY_META, TableCategory } from '@/lib/categories';

const categories: TableCategory[] = ['SILVER', 'GOLD', 'PLATINUM', 'PLATINUM_PLUS', 'ELITE', 'STREAM_RENDER'];

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 6, md: 10 } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: { xs: 6, md: 10 } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <SportsEsports sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              ADEKS
            </Typography>
          </Stack>
          <Button href="/login" variant="contained">
            Giriş / Kayıt
          </Button>
        </Stack>

        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 36, md: 56 }, mb: 2 }}>
            Masanı seç, oyuna başla.
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 620, mx: 'auto', mb: 4 }}>
            Silver'dan Render'a kadar 5 kategori. Online rezervasyon, canlı destek
            mesajlaşması ve hızlı kayıt. ADEKS internet kafe deneyimi.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
            <Button href="/login" variant="contained" size="large" startIcon={<Bolt />}>
              Hemen Kayıt Ol
            </Button>
            <Button href="/login" variant="outlined" size="large">
              Giriş Yap
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 8,
          }}
        >
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <Card key={cat}>
                <CardContent>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: meta.color,
                      mb: 1.5,
                      boxShadow: `0 0 20px ${meta.color}55`,
                    }}
                  />
                  <Typography variant="h6" sx={{ mb: 0.5 }}>
                    {meta.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                    {meta.description}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {meta.defaultRate} ₺/saat
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          <Feature icon={<EventSeat />} title="Anında Rezervasyon" body="Müsait masaları gör, tarih ve saat seç, talebini gönder." />
          <Feature icon={<Chat />} title="Canlı Mesajlaşma" body="Soru sor, özel istek bildir; kafe ekibi anlık olarak cevaplar." />
          <Feature icon={<Bolt />} title="OTP Güvenli Kayıt" body="E-posta + 6 haneli kodla doğrulamalı kayıt. Şifreni biz tutmuyoruz." />
        </Box>
      </Container>
    </Box>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ color: 'primary.main', mb: 1, '& svg': { fontSize: 28 } }}>{icon}</Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{body}</Typography>
      </CardContent>
    </Card>
  );
}
