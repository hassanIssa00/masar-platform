import type { MetadataRoute } from 'next';

/**
 * Generates /robots.txt via Next.js App Router Metadata API.
 * ──────────────────────────────────────────────────────────
 * - يسمح لمحركات البحث (Googlebot / Bingbot) بفهرسة جميع الصفحات العامة ومحتوى SEO.
 * - يمنع عناكب البحث من إهدار ميزانية الزحف على لوحات التحكم الخاصة والـ API.
 * - يشير مباشرة إلى ملف sitemap.xml المعتمد.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/school-student/',
          '/school-parent/',
          '/parent/',
          '/parents/',
          '/specialist/',
          '/messages/',
          '/meetings/',
          '/live/',
          '/invoices/',
          '/consents/',
          '/face-enroll/',
          '/face-id/',
          '/account-generator/',
          '/bi-dashboard/',
          '/iep/',
          '/session-records/',
          '/platform-settings/',
          '/student/',
          '/students/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/school-student/',
          '/school-parent/',
          '/parent/',
          '/specialist/',
          '/messages/',
          '/invoices/',
        ],
      },
    ],
    sitemap: 'https://masarplatform.org/sitemap.xml',
  };
}
