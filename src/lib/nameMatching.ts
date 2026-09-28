/**
 * Arabic Name Normalization and Patronymic Matching Utilities
 * Enables intelligent connection between parents and children based on Arabic naming patterns.
 */

import type { StudentRecord } from './cloudStore';

/**
 * Normalizes Arabic text by removing tashkeel, standardizing letters (أ, إ, آ, ٱ -> ا; ة -> ه; ى -> ي),
 * removing honorific prefixes/titles, and normalizing whitespace.
 */
export function normalizeArabicText(text?: string | null): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    // Remove Arabic diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Standardize Alef variants
    .replace(/[أإآٱ]/g, 'ا')
    // Standardize Taa Marbuta & Haa
    .replace(/ة/g, 'ه')
    // Standardize Yaa & Alef Maksura
    .replace(/ى/g, 'ي')
    // Remove common prefixes/honorifics if present at the start of parent/student name
    .replace(/^(أ\.|د\.|أستاذ|استاذ|دكتور|دكتوره|الدكتور|الدكتورة|السيد|السيدة|الشيخ|والد الطالب|والد|والدة|أم|ام|أبو|ابو|ولي أمر|ولي امر)\s+/gi, '')
    // Normalize multi-spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Robust student name matching that handles Arabic name variations:
 * - Exact match after normalization
 * - Substring containment (either direction)
 * - First two words match (father's name)
 * - Word overlap >= 2 words (handles partial name registration)
 */
export function isStudentNameMatch(name1?: string | null, name2?: string | null): boolean {
  let n1 = normalizeArabicText(name1);
  let n2 = normalizeArabicText(name2);
  if (!n1 || !n2 || n1.length < 2 || n2.length < 2) return false;

  // Strip common structural prefixes like "فصل " or "طالب "
  n1 = n1.replace(/^(فصل|طالب|الطالب)\s*[:\-–\/]?\s*/gi, '').trim();
  n2 = n2.replace(/^(فصل|طالب|الطالب)\s*[:\-–\/]?\s*/gi, '').trim();

  // 1. Exact match after cleaning
  if (n1 === n2) return true;

  const words1 = n1.split(' ').filter(Boolean);
  const words2 = n2.split(' ').filter(Boolean);

  // If either name has only 1 single word (e.g. just "أحمد"), NEVER match unless exactly equal
  if (words1.length < 2 || words2.length < 2) {
    return n1 === n2;
  }

  // 2. First two words match (student first name + father's name)
  // e.g. "أحمد إبراهيم زويل" and "أحمد إبراهيم" -> true
  // but "أحمد إبراهيم زويل" and "أحمد ربيع" -> false (different fathers)
  if (words1[0] === words2[0] && words1[1] === words2[1]) {
    return true;
  }

  // 3. Substring containment ONLY if the shorter string has 2+ words (first + second name)
  if (words1.length >= 2 && words2.length >= 2) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  // 4. Word overlap: MUST match first name AND have at least 2 words overlapping
  if (words1[0] === words2[0]) {
    const set1 = new Set(words1);
    let overlapCount = 0;
    for (const w of words2) {
      if (set1.has(w)) overlapCount++;
    }
    if (overlapCount >= 2) return true;
  }

  return false;
}

/**
 * Splits a full name into distinct words after normalization.
 */
export function getNormalizedWords(text?: string | null): string[] {
  const norm = normalizeArabicText(text);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

/**
 * Extracts the father's name from a student's full name.
 * e.g. "خالد ماجد عطيه موسي" -> "ماجد عطيه موسي"
 */
export function extractFatherNameFromStudent(studentFullName?: string | null): string {
  const words = getNormalizedWords(studentFullName);
  if (words.length <= 1) return '';
  return words.slice(1).join(' ');
}

/**
 * Checks if a student's full name matches a parent's name through Arabic patronymic rules.
 * Examples:
 * - Student: "خالد ماجد عطيه موسي" vs Parent: "ماجد عطيه موسي" -> true
 * - Student: "خالد ماجد عطية موسى" vs Parent: "ماجد عطيه موسي" -> true
 * - Student: "خالد ماجد عطيه" vs Parent: "ماجد عطيه موسي" -> true
 * - Student: "خالد ماجد" vs Parent: "ماجد عطيه" -> true
 */
export function isParentChildNameMatch(studentFullName?: string | null, parentName?: string | null): boolean {
  const normStudent = normalizeArabicText(studentFullName);
  const normParent = normalizeArabicText(parentName);

  if (!normStudent || !normParent) return false;
  if (normParent.length < 2 || normStudent.length < 2) return false;

  // Exact match (in case student.parentName is compared directly with parent.name)
  if (normStudent === normParent) return true;

  // Direct containment: student full name contains parent name
  if (normStudent.includes(normParent)) return true;

  // Reverse containment: parent name contains student father part
  const studentWords = normStudent.split(' ').filter(Boolean);
  const parentWords = normParent.split(' ').filter(Boolean);

  if (studentWords.length >= 2 && parentWords.length >= 1) {
    // Check father portion of student (words after the first name)
    const studentFatherPart = studentWords.slice(1).join(' ');
    const parentFullPart = parentWords.join(' ');

    if (studentFatherPart.includes(parentFullPart) || parentFullPart.includes(studentFatherPart)) {
      return true;
    }

    // Check if the first word of parent name matches the second word of student name (the direct father)
    if (studentWords[1] === parentWords[0]) {
      // If parent only provided 1 or 2 names, matching the father name is a strong indicator
      if (parentWords.length === 1) {
        return true;
      }
      // If parent provided 2+ names, check if second parent word matches third student word
      if (parentWords.length >= 2 && studentWords.length >= 3) {
        if (studentWords[2] === parentWords[1]) {
          return true;
        }
      }
      // High word overlap count
      let matchCount = 0;
      for (const pw of parentWords) {
        if (studentWords.slice(1).includes(pw)) {
          matchCount++;
        }
      }
      if (matchCount >= 2 || matchCount >= parentWords.length - 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds all students that belong to a given parent.
 */
export function findStudentsForParent(
  parent: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    schoolBranch?: string;
    linkedStudentId?: string;
    linkedStudentEmail?: string;
    linkedParentId?: string;
    linkedParentEmail?: string;
  } | null | undefined,
  allStudents: StudentRecord[]
): StudentRecord[] {
  if (!parent || !Array.isArray(allStudents) || allStudents.length === 0) {
    return [];
  }

  const pPhone = parent.phone ? parent.phone.replace(/\D/g, '') : '';
  const pPhoneSuffix = pPhone.length >= 8 ? pPhone.slice(-8) : '';
  const pName = parent.name ? normalizeArabicText(parent.name) : '';
  const pEmail = parent.email ? parent.email.trim().toLowerCase() : '';
  const pId = parent.id || '';
  const linkedId = parent.linkedStudentId || (parent as any)?.linkedStudentId || '';
  const linkedStudentEmail = ((parent as any)?.linkedStudentEmail || '').trim().toLowerCase();
  const linkedParentId = ((parent as any)?.linkedParentId || parent.id || '').trim();
  const linkedParentEmail = ((parent as any)?.linkedParentEmail || parent.email || '').trim().toLowerCase();
  const parentBranch = (parent as any)?.schoolBranch || '';
  const sameBranch = (s: StudentRecord) => !parentBranch || !s.schoolBranch || s.schoolBranch === parentBranch;

  // Direct linkedStudentId match
  if (linkedId) {
    const linked = allStudents.find((s) =>
      s.id === linkedId ||
      (s as any).studentAccountId === linkedId ||
      (s as any).linkedStudentId === linkedId
    );
    if (linked) {
      return [linked];
    }
  }

  const matched = allStudents.filter((s) => {
    const record = s as StudentRecord & {
      email?: string;
      parentEmail?: string;
      recoveryEmail?: string;
      linkedStudentEmail?: string;
      parentAccountId?: string;
      linkedParentId?: string;
      linkedParentEmail?: string;
      studentAccountId?: string;
    };

    if (!sameBranch(s)) return false;
    
    // Direct ID match
    if (linkedId && s.id === linkedId) return true;
    if (linkedId && (record.studentAccountId === linkedId || (record as any).linkedStudentId === linkedId)) return true;
    if (pId && s.id === pId) return true;
    if (pId && (record.parentAccountId === pId || record.linkedParentId === pId)) return true;
    if (linkedParentId && (record.parentAccountId === linkedParentId || record.linkedParentId === linkedParentId)) return true;

    // Explicit generated-account links. These are trusted even when the email is generated.
    if (linkedStudentEmail) {
      if ((record.email || '').trim().toLowerCase() === linkedStudentEmail) return true;
      if ((record.recoveryEmail || '').trim().toLowerCase() === linkedStudentEmail) return true;
      if ((record.linkedStudentEmail || '').trim().toLowerCase() === linkedStudentEmail) return true;
    }
    if (linkedParentEmail) {
      if ((record.parentEmail || '').trim().toLowerCase() === linkedParentEmail) return true;
      if ((record.linkedParentEmail || '').trim().toLowerCase() === linkedParentEmail) return true;
    }

    // Phone match by last 8 digits (handles country code variants +20, 0020, 010...)
    if (s.parentPhone) {
      const sPhone = s.parentPhone.replace(/\D/g, '');
      const sPhoneSuffix = sPhone.length >= 8 ? sPhone.slice(-8) : '';
      if (pPhoneSuffix && sPhoneSuffix && (sPhoneSuffix === pPhoneSuffix || sPhone.includes(pPhoneSuffix) || pPhone.includes(sPhoneSuffix))) {
        return true;
      }
    }

    // Email match
    if (pEmail && !pEmail.includes('generated') && !pEmail.includes('@masar.local') && !pEmail.includes('@masarplatform.org')) {
      if (record.parentEmail && record.parentEmail.trim().toLowerCase() === pEmail) return true;
      if (record.recoveryEmail && record.recoveryEmail.trim().toLowerCase() === pEmail) return true;
      if (record.email && record.email.trim().toLowerCase() === pEmail) return true;
    }

    // Parent name match & Patronymic match
    if (pName && pName.length >= 2 && pName !== 'ولي الامر') {
      if (s.parentName && normalizeArabicText(s.parentName) === pName) return true;
      if (s.parentName && isParentChildNameMatch(s.parentName, pName)) return true;
      if (s.fullName && isParentChildNameMatch(s.fullName, pName)) return true;
    }

    return false;
  });

  if (matched.length > 0) {
    const realMatches = matched.filter((s) => s.fullName && !s.fullName.includes('جديد') && !s.fullName.includes('الاستبيان'));
    return realMatches.length > 0 ? realMatches : matched;
  }

  return [];
}

/**
 * Finds the best single matching student for a parent.
 */
export function findMatchingStudentForParent(
  parent: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    schoolBranch?: string;
    linkedStudentId?: string;
    linkedStudentEmail?: string;
    linkedParentId?: string;
    linkedParentEmail?: string;
  } | null | undefined,
  allStudents: StudentRecord[]
): StudentRecord | undefined {
  const matches = findStudentsForParent(parent, allStudents);
  return matches[0];
}
