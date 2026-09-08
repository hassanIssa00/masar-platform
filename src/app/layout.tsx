import './globals.css';
import type { Metadata, Viewport } from 'next';
import CloudSyncProvider from '@/components/CloudSyncProvider';
import FaceAuthPreloader from '@/components/FaceAuthPreloader';
import JsonLdSchema from '@/components/JsonLdSchema';
import { Cairo } from 'next/font/google';

export const metadata: Metadata = {
  metadataBase: new URL('https://masarplatform.org'),
  title: {
    default: 'د. إسماعيل عيسى | منصة مَسَار — تشخيص وتطوير قدرات الأطفال وعلاج صعوبات التعلم',
    template: '%s | د. إسماعيل عيسى — منصة مسار',
  },
  description:
    'منصة مَسَار التعليمية بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية (IEP)، تأسيس القراءة والحساب، وعلاج صعوبات التعلم (الديسلكسيا والديسكالكوليا) وتعديل السلوك للأطفال.',
  keywords: [
    'دكتور إسماعيل عيسى',
    'د. إسماعيل عيسى',
    'منصة مسار',
    'منصة مَسَار',
    'صعوبات التعلم',
    'علاج صعوبات التعلم',
    'تشخيص صعوبات التعلم',
    'علاج صعوبات القراءة',
    'عسر القراءة',
    'الديسلكسيا',
    'صعوبات الحساب والرياضيات',
    'الديسكالكوليا',
    'تأسيس الأطفال في القراءة',
    'خطة تربوية فردية',
    'برنامج IEP',
    'تعديل سلوك الأطفال',
    'تشتت الانتباه وفرط الحركة',
    'ADHD للأطفال',
    'تقييم قدرات الطفل',
    'اختبار الذكاء والقدرات العقلية',
    'مدرسة الإخلاص الأهلية',
    'استشارات تربوية ونفسية للأطفال',
  ],
  authors: [{ name: 'د. إسماعيل عيسى', url: 'https://masarplatform.org' }],
  creator: 'د. إسماعيل عيسى',
  publisher: 'منصة مَسَار التعليمية',
  category: 'education',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://masarplatform.org',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'د. إسماعيل عيسى | منصة مَسَار — تشخيص وتطوير قدرات الأطفال',
    description:
      'منصة مَسَار بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية، وتأسيس أكاديمي متكامل لكل طالب.',
    url: 'https://masarplatform.org',
    siteName: 'منصة مَسَار | د. إسماعيل عيسى',
    locale: 'ar_SA',
    type: 'website',
    images: [
      {
        url: '/dr-ismail-student.jpg',
        width: 1280,
        height: 854,
        alt: 'د. إسماعيل عيسى مع الطلاب في منصة مسار',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'د. إسماعيل عيسى | منصة مَسَار لتطوير قدرات الأطفال',
    description:
      'منصة مَسَار بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية، وتأسيس أكاديمي متكامل.',
    images: ['/dr-ismail-student.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'google-site-verification-masar',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#059669',
};

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
      <head>
        <JsonLdSchema />
      </head>
      <body className={cairo.className}>
        <FaceAuthPreloader />
        <CloudSyncProvider>{children}</CloudSyncProvider>
      </body>
    </html>
  );
}
