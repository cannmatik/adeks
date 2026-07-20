'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Typography, Card, CardContent, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { QrCodeScanner, TableRestaurant } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialTable = searchParams.get('table') || '';
  
  const [code, setCode] = useState(initialCode);
  const [tableInput, setTableInput] = useState(initialTable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClient();



  // Let's refactor the join logic slightly to allow passing the code directly
  const executeJoin = async (targetCode: string, targetTable: string) => {
    if (!targetTable) {
      setError('Lütfen masa numarasını giriniz.');
      return;
    }
    if (!targetCode || targetCode.length < 5) {
      setError('Lütfen geçerli bir masa kodu giriniz.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/anonymous-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode.toUpperCase(), tableNumber: targetTable })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Bağlantı sağlanamadı.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        throw new Error('Giriş yapılırken bir hata oluştu: ' + signInError.message);
      }

      router.push('/session');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Bilinmeyen bir hata oluştu.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialCode.length === 6 && initialTable) {
      setCode(initialCode);
      setTableInput(initialTable);
      executeJoin(initialCode, initialTable);
    }
  }, [initialCode, initialTable]);

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeJoin(code, tableInput);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: 'background.default' }}>
      <Card sx={{ maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderRadius: 4 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          
          <Box sx={{ mb: 3, display: 'inline-flex', p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: '50%' }}>
            <TableRestaurant fontSize="large" />
          </Box>
          
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            {tableInput ? `Masa ${tableInput} Sipariş` : 'Masadan Sipariş'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Bağlanmak için masa ekranınızdaki veya yetkilinin verdiği 6 haneli güvenlik kodunu girin.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleJoin}>
            <TextField
              fullWidth
              variant="outlined"
              label="Masa Numarası"
              placeholder="Örn: 12"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{ htmlInput: { style: { textAlign: 'center', fontSize: 20, fontWeight: 'bold' } } }}
            />

            <TextField
              fullWidth
              variant="outlined"
              label="6 Haneli Masa Kodu"
              placeholder="Örn: 482915"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 6, style: { textAlign: 'center', letterSpacing: 8, fontSize: 24, fontWeight: 'bold' } } }}
              sx={{ mb: 3 }}
            />
            
            <Button 
              fullWidth 
              type="submit"
              variant="contained" 
              color="primary" 
              size="large"
              disabled={loading || code.length < 5}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QrCodeScanner />}
              sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 2 }}
            >
              {loading ? 'Bağlanıyor...' : 'Masaya Bağlan'}
            </Button>
          </form>
          
        </CardContent>
      </Card>
    </Box>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>}>
      <JoinContent />
    </Suspense>
  );
}
