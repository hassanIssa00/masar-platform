import React from 'react';

/**
 * JsonLdSchema — Structured Data for Google Rich Snippets
 * ────────────────────────────────────────────────────────
 * Generates Schema.org JSON-LD markup to help Google:
 * 1. Understand the platform identity (EducationalOrganization)
 * 2. Display Sitelinks Search Box (WebSite)
 * 3. Recognize Dr. Ismail Issa as an authority/author (Person)
 * 4. Display rich courses/programs in search results (Course / EducationalOccupationalProgram)
 */
export default function JsonLdSchema() {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': 'https://masarplatform.org/#organization',
    name: 'منصة مَسَار | د. إسماعيل عيسى',
    alternateName: ['Masar Platform', 'منصة مسار التعليمية', 'فصل د. إسماعيل عيسى'],
    url: 'https://masarplatform.org',
    logo: {
      '@type': 'ImageObject',
      url: 'https://masarplatform.org/icon.png',
      width: 512,
      height: 512,
    },
    image: 'https://masarplatform.org/dr-ismail-student.jpg',
    description:
      'منصة مَسَار بإشراف د. إسماعيل عيسى — تشخيص علمي دقيق، خطة تدريب فردية، ومتابعة ذكية لتنمية مهارات الأطفال وعلاج صعوبات التعلم وتأسيس القراءة والرياضيات.',
    founder: {
      '@type': 'Person',
      '@id': 'https://masarplatform.org/#drismail',
      name: 'د. إسماعيل عيسى',
      jobTitle: 'استشاري وخبير صعوبات التعلم وتعديل سلوك الأطفال',
      worksFor: {
        '@id': 'https://masarplatform.org/#organization',
      },
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'SA',
      addressLocality: 'جدة',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Arabic', 'English'],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://masarplatform.org/#website',
    url: 'https://masarplatform.org',
    name: 'منصة مَسَار',
    publisher: {
      '@id': 'https://masarplatform.org/#organization',
    },
    inLanguage: 'ar-SA',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://masarplatform.org/programs?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const programsSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'برامج منصة مسار التعليمية والتشخيصية',
    itemListElement: [
      {
        '@type': 'Course',
        position: 1,
        name: 'برنامج تأسيس القراءة وعلاج صعوبات التعلم',
        description: 'برنامج علاجي وتأسيسي لعلاج عسر القراءة (الديسلكسيا) وتنمية الطلاقة والفهم القرائي.',
        provider: {
          '@id': 'https://masarplatform.org/#organization',
        },
        url: 'https://masarplatform.org/programs/reading',
      },
      {
        '@type': 'Course',
        position: 2,
        name: 'برنامج الرياضيات والتفكير المنطقي المحسوس',
        description: 'تطوير المفاهيم الرياضية للأطفال وعلاج عسر الحساب (الديسكالكوليا) بالنماذج التفاعلية.',
        provider: {
          '@id': 'https://masarplatform.org/#organization',
        },
        url: 'https://masarplatform.org/programs/math',
      },
      {
        '@type': 'Course',
        position: 3,
        name: 'برنامج التقييم والتشخيص الشامل للطفل (IEP)',
        description: 'فحص إكلينيكي وتربوي شامل يحدد مكامن القوة والاحتياج ويبني خطة تربوية فردية متكاملة.',
        provider: {
          '@id': 'https://masarplatform.org/#organization',
        },
        url: 'https://masarplatform.org/assessment',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(programsSchema) }}
      />
    </>
  );
}
