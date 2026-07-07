'use client';

import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert, Stack, CircularProgress } from '@mui/material';
import { Save } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    login_text: '',
    footer_text: '',
    open_time: '',
    close_time: ''
  });

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ayarlar yüklenemedi');
      setFormData({
        login_text: data.login_text || '',
        footer_text: data.footer_text || '',
        open_time: data.open_time || '',
        close_time: data.close_time || ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi');
      setSuccess('Ayarlar başarıyla kaydedildi.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>Kafe Ayarları</Typography>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          <Stack spacing={4}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Giriş Ekranı Metinleri</Typography>
              <Stack spacing={3}>
                <TextField
                  label="Giriş Ekranı Ana Metin"
                  name="login_text"
                  value={formData.login_text}
                  onChange={handleChange}
                  fullWidth
                  helperText="Örn: Çalışma Saatleri: 07:30 - 02:00"
                />
                <TextField
                  label="Alt Bilgi (Footer) Metni"
                  name="footer_text"
                  value={formData.footer_text}
                  onChange={handleChange}
                  fullWidth
                  helperText="Örn: Adeks İnternet Kafe Online Rezervasyon"
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Çalışma Saatleri</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <TextField
                  label="Açılış Saati"
                  name="open_time"
                  type="time"
                  value={formData.open_time}
                  onChange={handleChange}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                />
                <TextField
                  label="Kapanış Saati"
                  name="close_time"
                  type="time"
                  value={formData.close_time}
                  onChange={handleChange}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                  helperText="Gece yarısını geçiyorsa, rezervasyon kontrolleri otomatik hesaplar."
                />
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
