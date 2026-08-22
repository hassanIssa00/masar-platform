import { deleteDocFromCloud, syncDocToCloud } from './firestoreSync';

// ── Types ──────────────────────────────────────────────────────────────────────

export type SubjectGrade = 'grade1' | 'grade2';

export interface CurriculumSubject {
  id: string;
  name: string;
  nameEn: string;
  grade: SubjectGrade;
  icon: string;
  color: string; // tailwind bg color
}

export interface CurriculumFile {
  id: string;
  subjectId: string;
  name: string;         // e.g. "الفصل الأول - لغتي 1"
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp';
  base64Data: string;   // full base64 (stored locally for AI access)
  totalPages?: number;
  uploadedAt: string;
  sizeKb?: number;
}

export interface GeneratedQuiz {
  id: string;
  subjectId: string;
  fileId: string;
  title: string;
  pageFrom: number;
  pageTo: number;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
  questions: QuizQuestion[];
  createdAt: string;
  sentAt?: string;
  status: 'draft' | 'sent' | 'closed';
}

export interface QuizQuestion {
  id: string;
  text: string;
  options?: string[];            // for multiple_choice
  correctAnswer: string;         // exact match string
  explanation?: string;
}

export interface StudentQuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, string>; // questionId -> answer
  score?: number;                  // 0-100
  submittedAt: string;
  correctedAt?: string;
  correctionNote?: string;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const FILES_KEY = 'masar_curriculum_files_v1';
const QUIZZES_KEY = 'masar_curriculum_quizzes_v1';
const SUBMISSIONS_KEY = 'masar_quiz_submissions_v1';

// ── Built-in Subjects ─────────────────────────────────────────────────────────

export const CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  // Grade 1
  { id: 'g1-arabic',   name: 'لغتي العربية', nameEn: 'Arabic Language', grade: 'grade1', icon: '📖', color: 'bg-emerald-100' },
  { id: 'g1-quran',    name: 'القرآن الكريم', nameEn: 'Quran', grade: 'grade1', icon: '🕌', color: 'bg-teal-100' },
  { id: 'g1-islamic',  name: 'التربية الإسلامية', nameEn: 'Islamic Studies', grade: 'grade1', icon: '☪️', color: 'bg-green-100' },
  { id: 'g1-math',     name: 'الرياضيات', nameEn: 'Mathematics', grade: 'grade1', icon: '🔢', color: 'bg-blue-100' },
  { id: 'g1-science',  name: 'العلوم', nameEn: 'Science', grade: 'grade1', icon: '🔬', color: 'bg-indigo-100' },
  { id: 'g1-social',   name: 'الاجتماعيات', nameEn: 'Social Studies', grade: 'grade1', icon: '🌍', color: 'bg-amber-100' },
  { id: 'g1-art',      name: 'التربية الفنية', nameEn: 'Art Education', grade: 'grade1', icon: '🎨', color: 'bg-rose-100' },
  { id: 'g1-pe',       name: 'التربية البدنية', nameEn: 'Physical Education', grade: 'grade1', icon: '⚽', color: 'bg-orange-100' },
  { id: 'g1-comp',     name: 'الحاسب الآلي', nameEn: 'Computer Science', grade: 'grade1', icon: '💻', color: 'bg-slate-100' },
  // Grade 2
  { id: 'g2-arabic',   name: 'لغتي العربية', nameEn: 'Arabic Language', grade: 'grade2', icon: '📖', color: 'bg-emerald-100' },
  { id: 'g2-quran',    name: 'القرآن الكريم', nameEn: 'Quran', grade: 'grade2', icon: '🕌', color: 'bg-teal-100' },
  { id: 'g2-islamic',  name: 'التربية الإسلامية', nameEn: 'Islamic Studies', grade: 'grade2', icon: '☪️', color: 'bg-green-100' },
  { id: 'g2-math',     name: 'الرياضيات', nameEn: 'Mathematics', grade: 'grade2', icon: '🔢', color: 'bg-blue-100' },
  { id: 'g2-science',  name: 'العلوم', nameEn: 'Science', grade: 'grade2', icon: '🔬', color: 'bg-indigo-100' },
  { id: 'g2-social',   name: 'الاجتماعيات', nameEn: 'Social Studies', grade: 'grade2', icon: '🌍', color: 'bg-amber-100' },
  { id: 'g2-art',      name: 'التربية الفنية', nameEn: 'Art Education', grade: 'grade2', icon: '🎨', color: 'bg-rose-100' },
  { id: 'g2-pe',       name: 'التربية البدنية', nameEn: 'Physical Education', grade: 'grade2', icon: '⚽', color: 'bg-orange-100' },
  { id: 'g2-comp',     name: 'الحاسب الآلي', nameEn: 'Computer Science', grade: 'grade2', icon: '💻', color: 'bg-slate-100' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function writeList<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage full */ }
}

// ── Curriculum Files ──────────────────────────────────────────────────────────

export function getCurriculumFiles(subjectId?: string): CurriculumFile[] {
  const all = readList<CurriculumFile>(FILES_KEY);
  return subjectId ? all.filter(f => f.subjectId === subjectId) : all;
}

export function saveCurriculumFile(file: Omit<CurriculumFile, 'id' | 'uploadedAt'>): CurriculumFile {
  const all = readList<CurriculumFile>(FILES_KEY);
  const newFile: CurriculumFile = {
    ...file,
    id: `cf-${Date.now()}`,
    uploadedAt: new Date().toISOString(),
  };
  writeList(FILES_KEY, [newFile, ...all]);
  // Sync metadata to cloud (without base64 data — too large)
  const { base64Data: _base64Data, ...meta } = newFile;
  void _base64Data;
  syncDocToCloud('curriculum_files', newFile.id, meta);
  return newFile;
}

export function deleteCurriculumFile(fileId: string) {
  writeList(FILES_KEY, readList<CurriculumFile>(FILES_KEY).filter(f => f.id !== fileId));
  deleteDocFromCloud('curriculum_files', fileId);
}

// ── Quizzes ───────────────────────────────────────────────────────────────────

export function getAllQuizzes(): GeneratedQuiz[] {
  return readList<GeneratedQuiz>(QUIZZES_KEY);
}

export function getQuizzesBySubject(subjectId: string): GeneratedQuiz[] {
  return readList<GeneratedQuiz>(QUIZZES_KEY).filter(q => q.subjectId === subjectId);
}

export function saveQuiz(quiz: GeneratedQuiz): GeneratedQuiz {
  const all = readList<GeneratedQuiz>(QUIZZES_KEY);
  const idx = all.findIndex(q => q.id === quiz.id);
  if (idx >= 0) all[idx] = quiz;
  else all.unshift(quiz);
  writeList(QUIZZES_KEY, all);
  syncDocToCloud('curriculum_quizzes', quiz.id, quiz);
  return quiz;
}

export function deleteQuiz(quizId: string) {
  writeList(QUIZZES_KEY, readList<GeneratedQuiz>(QUIZZES_KEY).filter(q => q.id !== quizId));
  deleteDocFromCloud('curriculum_quizzes', quizId);
}

export function createQuizId(): string {
  return `quiz-${Date.now()}`;
}

// ── Submissions ───────────────────────────────────────────────────────────────

export function getSubmissions(quizId?: string): StudentQuizSubmission[] {
  const all = readList<StudentQuizSubmission>(SUBMISSIONS_KEY);
  return quizId ? all.filter(s => s.quizId === quizId) : all;
}

export function saveSubmission(sub: StudentQuizSubmission): StudentQuizSubmission {
  const all = readList<StudentQuizSubmission>(SUBMISSIONS_KEY);
  const idx = all.findIndex(s => s.id === sub.id);
  if (idx >= 0) all[idx] = sub;
  else all.unshift(sub);
  writeList(SUBMISSIONS_KEY, all);
  syncDocToCloud('quiz_submissions', sub.id, sub);
  return sub;
}

// ── Auto-grade a submission against a quiz ────────────────────────────────────

export function autoGradeSubmission(submission: StudentQuizSubmission, quiz: GeneratedQuiz): StudentQuizSubmission {
  let correct = 0;
  quiz.questions.forEach(q => {
    const studentAns = (submission.answers[q.id] || '').trim().toLowerCase();
    const correctAns = (q.correctAnswer || '').trim().toLowerCase();
    if (studentAns === correctAns) correct++;
  });
  const score = quiz.questions.length > 0
    ? Math.round((correct / quiz.questions.length) * 100)
    : 0;

  const graded: StudentQuizSubmission = {
    ...submission,
    score,
    correctedAt: new Date().toISOString(),
  };
  return saveSubmission(graded);
}
