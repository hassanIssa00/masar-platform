import type { MetadataRoute } from 'next';

/**
 * Generates /robots.txt via the Next.js App Router Metadata API.
 *
 * Authenticated and administrative routes are disallowed to prevent search
 * engines from indexing private pages and to avoid accidentally leaking
 * internal route structure in search results.
 *
 * NOTE: robots.txt is a crawling hint, NOT a security control.
 * Access to these routes is enforced by the session middleware and
 * Firestore Security Rules — not by this file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/parent',
          '/parent/',
          '/kids',
          '/kids/',
          '/admin',
          '/admin/',
          '/school-parent',
          '/school-parent/',
          '/school-student',
          '/school-student/',
          '/student',
          '/student/',
          '/reports',
          '/reports/',
          '/branches',
          '/branches/',
          '/platform-settings',
          '/platform-settings/',
          '/nexus',
          '/nexus/',
          '/specialist',
          '/specialist/',
          '/session-records',
          '/session-records/',
          '/messages',
          '/messages/',
          '/invoices',
          '/invoices/',
          '/meetings',
          '/meetings/',
          '/live',
          '/live/',
          '/students',
          '/students/',
          '/parents',
          '/parents/',
          '/api',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://masarplatform.org/sitemap.xml',
  };
}
