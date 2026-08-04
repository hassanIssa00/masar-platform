import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'د. إسماعيل عيسى | اكتشف طفلك — طوّر قدراته — غيّر مستقبله',
  description: 'منصة مَسَار بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية، ومتابعة ذكية لكل طالب.',
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
