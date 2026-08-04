import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'منصة د. إسماعيل عيسى | تعليم علاجي وخطط فردية',
  description: 'منصة متكاملة للتقييم، المناهج العلاجية، متابعة الجلسات، وتقارير تقدم الطلاب.',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '48x48', type: 'image/png' },
    shortcut: '/favicon-32.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import CloudSyncProvider from '@/components/CloudSyncProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <CloudSyncProvider>{children}</CloudSyncProvider>
      </body>
    </html>
  );
}
