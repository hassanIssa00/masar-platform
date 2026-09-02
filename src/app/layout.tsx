import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'د. إسماعيل عيسى | اكتشف طفلك — طوّر قدراته — غيّر مستقبله',
  description: 'منصة مَسَار بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية، ومتابعة ذكية لكل طالب.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '48x48', type: 'image/png' },
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'د. إسماعيل عيسى | اكتشف طفلك — طوّر قدراته — غيّر مستقبله',
    description: 'منصة مَسَار بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية، ومتابعة ذكية لكل طالب.',
    url: 'https://masar-platform.org',
    siteName: 'منصة مَسَار',
    locale: 'ar_EG',
    type: 'website',
    images: [{ url: 'https://masar-platform.org/dr-ismail-student.jpg', width: 1280, height: 854 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'د. إسماعيل عيسى | اكتشف طفلك — طوّر قدراته — غيّر مستقبله',
    description: 'منصة مَسَار بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية، ومتابعة ذكية لكل طالب.',
    images: ['https://masar-platform.org/dr-ismail-student.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import CloudSyncProvider from '@/components/CloudSyncProvider';
import { Cairo } from 'next/font/google';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-cairo',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className={cairo.className}>
        <CloudSyncProvider>{children}</CloudSyncProvider>
      </body>
    </html>
  );
}
