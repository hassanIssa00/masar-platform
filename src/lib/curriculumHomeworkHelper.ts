'use client';

import { curriculaList, type CurriculumSubject } from '@/data/curriculaData';
import { readCloudCache } from '@/lib/firestoreSync';

export interface ParsedCurriculumHw {
  subjectSlug: string;
  subjectTitle: string;
  fromPage: number;
  toPage: number;
  totalPages: number;
  pagesList: number[];
  color?: string;
  badge?: string;
}

const ASSIGNMENTS_KEY = 'masar.curriculumAssignments.v1';

const SUBJECT_KEYWORDS: Record<string, { slug: string; title: string }> = {
  علوم: { slug: 'science', title: 'العلوم' },
  العلوم: { slug: 'science', title: 'العلوم' },
  رياضيات: { slug: 'math', title: 'الرياضيات' },
  الرياضيات: { slug: 'math', title: 'الرياضيات' },
  حساب: { slug: 'math', title: 'الرياضيات' },
  لغتي: { slug: 'lughati', title: 'لغتي' },
  'لغتي الجميلة': { slug: 'lughati', title: 'لغتي' },
  'لغتي العربية': { slug: 'lughati', title: 'لغتي' },
  عربي: { slug: 'lughati', title: 'لغتي' },
  إسلامية: { slug: 'islamic', title: 'الدراسات الإسلامية' },
  'الدراسات الإسلامية': { slug: 'islamic', title: 'الدراسات الإسلامية' },
  توحيد: { slug: 'islamic', title: 'الدراسات الإسلامية' },
  فقه: { slug: 'islamic', title: 'الدراسات الإسلامية' },
  قرآن: { slug: 'islamic', title: 'الدراسات الإسلامية' },
  فنية: { slug: 'art', title: 'التربية الفنية' },
  'التربية الفنية': { slug: 'art', title: 'التربية الفنية' },
  رسم: { slug: 'art', title: 'التربية الفنية' },
  حياتية: { slug: 'life-skills', title: 'المهارات الحياتية والأسرية' },
  'المهارات الحياتية': { slug: 'life-skills', title: 'المهارات الحياتية والأسرية' },
  'التربية الأسرية': { slug: 'life-skills', title: 'المهارات الحياتية والأسرية' },
  إنجليزي: { slug: 'english', title: 'اللغة الإنجليزية' },
  'اللغة الإنجليزية': { slug: 'english', title: 'اللغة الإنجليزية' },
  انجليزي: { slug: 'english', title: 'اللغة الإنجليزية' },
  english: { slug: 'english', title: 'اللغة الإنجليزية' },
};

/**
 * Parses curriculum book and page range from homework title, description, or assignment records.
 */
export function parseHomeworkCurriculum(hw: {
  id?: string;
  studentId?: string;
  title?: string;
  description?: string;
  subjectSlug?: string;
  subjectTitle?: string;
  fromPage?: number;
  toPage?: number;
}): ParsedCurriculumHw | null {
  if (!hw) return null;

  const fullText = `${hw.title || ''} ${hw.description || ''}`;

  // 1. Detect Subject Slug & Title
  let detectedSlug = hw.subjectSlug;
  let detectedTitle = hw.subjectTitle;

  if (!detectedSlug) {
    for (const [kw, info] of Object.entries(SUBJECT_KEYWORDS)) {
      if (fullText.includes(kw)) {
        detectedSlug = info.slug;
        detectedTitle = info.title;
        break;
      }
    }
  }

  // Check against curriculaList slugs
  if (!detectedSlug) {
    const found = curriculaList.find((c) => fullText.includes(c.title) || fullText.includes(c.shortTitle));
    if (found) {
      detectedSlug = found.slug;
      detectedTitle = found.title;
    }
  }

  // 2. Detect Page Range
  let fromP = hw.fromPage;
  let toP = hw.toPage;

  if (!fromP || !toP) {
    // Check curriculum assignments cache first
    if (hw.studentId && detectedSlug) {
      const assignments = readCloudCache<any>(ASSIGNMENTS_KEY);
      const match = assignments.find(
        (a: any) => a.studentId === hw.studentId && a.subjectSlug === detectedSlug
      );
      if (match && match.fromPage && match.toPage) {
        fromP = match.fromPage;
        toP = match.toPage;
      }
    }
  }

  if (!fromP || !toP) {
    // Regex matches:
    // (ص 65-68) or (ص 65 إلى 68) or صفحة (50) إلى صفحة (55) or ص 65 إلى ص 68 or صفحات 10-15
    const match = fullText.match(
      /(?:ص|صفحة|صفحات)\s*\(?(\d+)\)?\s*(?:إلى|-|–)\s*(?:ص|صفحة)?\s*\(?(\d+)\)?/i
    );

    if (match) {
      fromP = parseInt(match[1], 10);
      toP = parseInt(match[2], 10);
    } else {
      // Single page match: ص 20 or صفحة (20)
      const singleMatch = fullText.match(/(?:ص|صفحة)\s*\(?(\d+)\)?/i);
      if (singleMatch) {
        fromP = parseInt(singleMatch[1], 10);
        toP = fromP;
      }
    }
  }

  if (!detectedSlug && !fromP) {
    return null;
  }

  // Fallbacks if only one is present
  const finalSlug = detectedSlug || 'science';
  const currData = curriculaList.find((c) => c.slug === finalSlug);
  const finalTitle = detectedTitle || currData?.title || 'المنهج الدراسي';

  const cleanFrom = Math.max(1, fromP || 1);
  const cleanTo = Math.max(cleanFrom, toP || cleanFrom);

  const pagesList: number[] = [];
  for (let p = cleanFrom; p <= cleanTo; p++) {
    pagesList.push(p);
  }

  return {
    subjectSlug: finalSlug,
    subjectTitle: finalTitle,
    fromPage: cleanFrom,
    toPage: cleanTo,
    totalPages: pagesList.length,
    pagesList,
    color: currData?.color,
    badge: currData?.badge,
  };
}

/**
 * Returns the URL of a curriculum page image.
 */
export function getCurriculumPageImageUrl(subjectSlug: string, pageNum: number): string {
  const padded = String(pageNum).padStart(3, '0');
  return `/resources/curricula/${subjectSlug}/page-${padded}.jpg`;
}
