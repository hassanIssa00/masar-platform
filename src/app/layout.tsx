import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'منصة د. إسماعيل عيسى | تعليم علاجي وخطط فردية',
  description: 'منصة متكاملة للتقييم، المناهج العلاجية، متابعة الجلسات، وتقارير تقدم الطلاب.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  );
}
