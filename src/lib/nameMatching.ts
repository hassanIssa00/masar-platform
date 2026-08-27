/**
 * Arabic Name Normalization and Patronymic Matching Utilities
 * Enables intelligent connection between parents and children based on Arabic naming patterns.
 */

import type { StudentRecord } from './localDb';

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
  parent: { id?: string; name?: string; phone?: string; email?: string; linkedStudentId?: string } | null | undefined,
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

  // Direct linkedStudentId match
  if (linkedId) {
    const linked = allStudents.find((s) => s.id === linkedId);
    if (linked) {
      return [linked];
    }
  }

  const matched = allStudents.filter((s) => {
    const record = s as StudentRecord & { email?: string; parentEmail?: string; recoveryEmail?: string };
    
    // Direct ID match
    if (linkedId && s.id === linkedId) return true;
    if (pId && s.id === pId) return true;

    // Phone match by last 8 digits (handles country code variants +20, 0020, 010...)
    if (s.parentPhone) {
      const sPhone = s.parentPhone.replace(/\D/g, '');
      const sPhoneSuffix = sPhone.length >= 8 ? sPhone.slice(-8) : '';
      if (pPhoneSuffix && sPhoneSuffix && (sPhoneSuffix === pPhoneSuffix || sPhone.includes(pPhoneSuffix) || pPhone.includes(sPhoneSuffix))) {
        return true;
      }
    }

    // Email match
    if (pEmail && !pEmail.includes('generated') && !pEmail.includes('@masar.local')) {
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

  if (allStudents.length === 1) {
    return allStudents;
  }

  return [];
}

/**
 * Finds the best single matching student for a parent.
 */
export function findMatchingStudentForParent(
  parent: { id?: string; name?: string; phone?: string; email?: string } | null | undefined,
  allStudents: StudentRecord[]
): StudentRecord | undefined {
  const matches = findStudentsForParent(parent, allStudents);
  return matches[0];
}
