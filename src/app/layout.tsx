import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from './providers';
import AuthProvider from '@/components/AuthProvider';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL || 'localhost:3000'}`,
  ),
  title: 'ADEKS İnternet Kafe',
  description: 'Masa rezervasyonu, kategori bazlı oyun istasyonları ve canlı destek.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={montserrat.variable}>
        <InitColorSchemeScript attribute="class" defaultMode="dark" />
        <AppRouterCacheProvider>
          <Providers>
            <AuthProvider>{children}</AuthProvider>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
