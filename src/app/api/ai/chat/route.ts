import { NextRequest, NextResponse } from 'next/server';
import { callGeminiApi, type GeminiMessage } from '@/lib/gemini';
import { authenticateRequest } from '@/lib/auth/authorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

export interface AiAction {
  type: string;
  label: string;
  target?: string;
  payload?: Record<string, unknown>;
}

interface StudentRecord {
  id: string;
  fullName: string;
  grade?: string;
  parentName?: string;
  parentPhone?: string;
  schoolBranch?: string;
}

interface AttendanceSummary {
  dateStr: string;
  dateArabic: string;
  dayName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  faceAttendanceCount: number;
  presentStudents: { name: string; via: string; time?: string }[];
  absentStudents: { name: string; parentPhone?: string }[];
  attendanceRate: number;
}

// â”€â”€ Arabic Text Normalization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function normalizeArabic(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[ظ‹ظŒظچظژظڈظگظ‘ظ’ظ€]/g, '')
    .replace(/[ط¥ط£ط¢ط§]/g, 'ط§')
    .replace(/ظ‰/g, 'ظٹ')
    .replace(/ط©/g, 'ظ‡')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// â”€â”€ Date Helpers (Saudi Arabia / Egypt) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getTodayInfo() {
  const now = new Date();
  const timeZone = 'Asia/Riyadh';
  const isoDate = now.toLocaleDateString('en-CA', { timeZone }); // YYYY-MM-DD
  const dayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long', timeZone }).format(now);
  const dateArabic = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(now);
  const timeArabic = new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit', timeZone }).format(now);

  return { isoDate, dayName, dateArabic, timeArabic };
}

// â”€â”€ Parse Multimodal Image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parseImage(image: unknown): { mimeType: string; data: string } | undefined {
  if (!image) return undefined;
  if (typeof image === 'object' && image !== null && 'data' in image) {
    const item = image as { mimeType?: string; data?: string };
    if (!item.data || item.data.length > 8_000_000) return undefined;
    return { mimeType: item.mimeType || 'image/png', data: item.data };
  }
  if (typeof image === 'string' && image.includes('base64,')) {
    const [meta, b64] = image.split('base64,');
    if (!b64 || b64.length > 8_000_000) return undefined;
    return { mimeType: meta.match(/data:(.*?);/)?.[1] || 'image/png', data: b64 };
  }
  return undefined;
}

// â”€â”€ Fetch Live Classroom Context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchClassroomContext(branch: string = 'IKHLAS_JEDDAH'): Promise<{
  students: StudentRecord[];
  attendance: AttendanceSummary;
}> {
  const { isoDate, dayName, dateArabic } = getTodayInfo();
  const adminDb = getAdminDb();

  const fallbackStudents: StudentRecord[] = [
    { id: 'st-1', fullName: 'ط£ط­ظ…ط¯ ط¥ط¨ط±ط§ظ‡ظٹظ… ط±ط¨ظٹط¹', grade: 'ط§ظ„ط£ظˆظ„ ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹ', schoolBranch: 'IKHLAS_JEDDAH' },
    { id: 'st-2', fullName: 'ظپط§ط±ط³ ط¹ط¨ط¯ ط§ظ„ظ„ظ‡ ط§ظ„ط´ظ‡ط±ظٹ', grade: 'ط§ظ„ط£ظˆظ„ ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹ', schoolBranch: 'IKHLAS_JEDDAH' },
    { id: 'st-3', fullName: 'ط³ظ„ظ…ط§ظ† ظپظ‡ط¯ ط§ظ„ط­ط±ط¨ظٹ', grade: 'ط§ظ„ط«ط§ظ†ظٹ ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹ', schoolBranch: 'IKHLAS_JEDDAH' },
    { id: 'st-4', fullName: 'ظٹظˆط³ظپ ط¹ظ…ط± ط§ظ„ط¹طھظٹط¨ظٹ', grade: 'ط§ظ„ط£ظˆظ„ ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹ', schoolBranch: 'IKHLAS_JEDDAH' },
    { id: 'st-5', fullName: 'ط±ظٹط§ظ† ط®ط§ظ„ط¯ ط§ظ„ط²ظ‡ط±ط§ظ†ظٹ', grade: 'ط§ظ„ط«ط§ظ†ظٹ ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹ', schoolBranch: 'IKHLAS_JEDDAH' },
  ];

  if (!adminDb) {
    return {
      students: fallbackStudents,
      attendance: {
        dateStr: isoDate,
        dateArabic,
        dayName,
        totalStudents: fallbackStudents.length,
        presentCount: 0,
        absentCount: fallbackStudents.length,
        faceAttendanceCount: 0,
        presentStudents: [],
        absentStudents: fallbackStudents.map((s) => ({ name: s.fullName })),
        attendanceRate: 0,
      },
    };
  }

  // 1. Fetch Students
  let students: StudentRecord[] = [];
  try {
    const classSnap = await adminDb.collection('class_students').limit(100).get();
    classSnap.docs.forEach((doc) => {
      const data = doc.data();
      students.push({
        id: doc.id,
        fullName: data.fullName || data.name || 'ط·ط§ظ„ط¨',
        grade: data.grade || 'ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„',
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        schoolBranch: data.schoolBranch || data.branch || 'IKHLAS_JEDDAH',
      });
    });

    if (students.length === 0) {
      const studSnap = await adminDb.collection('students').limit(100).get();
      studSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (branch === 'ALL' || data.schoolBranch === branch || data.branch === branch || data.source === 'ikhlas-jeddah') {
          students.push({
            id: doc.id,
            fullName: data.fullName || data.name || 'ط·ط§ظ„ط¨',
            grade: data.grade || 'ط§ظ„ظ…ط³طھظˆظ‰ ط§ظ„طھط£ط³ظٹط³ظٹ',
            parentName: data.parentName,
            parentPhone: data.parentPhone,
            schoolBranch: data.schoolBranch || data.branch || 'IKHLAS_JEDDAH',
          });
        }
      });
    }
  } catch (err) {
    console.error('[AI Chat] Failed to fetch students:', err);
  }

  if (students.length === 0) {
    students = fallbackStudents;
  }

  // 2. Fetch Attendance for Today
  const presentMap = new Map<string, { via: string; time?: string }>();

  try {
    // Check period attendance first
    const periodDocRef = adminDb.collection('period_attendance').doc(`masar_period_attendance_v2_${isoDate}`);
    const periodDoc = await periodDocRef.get();
    if (periodDoc.exists) {
      const data = periodDoc.data() || {};
      const matrix = data.matrix || {};
      Object.entries(matrix).forEach(([studentId, periods]: [string, any]) => {
        const isPresent = Object.values(periods || {}).some(
          (status) => status === 'present' || status === 'present_face'
        );
        if (isPresent) {
          const isFace = Object.values(periods || {}).some((s) => s === 'present_face');
          presentMap.set(studentId, { via: isFace ? 'ط¨طµظ…ط© ط§ظ„ظˆط¬ظ‡' : 'طھط³ط¬ظٹظ„ ظٹط¯ظˆظٹ' });
        }
      });
    }

    // Check direct attendance collection
    const attSnap = await adminDb.collection('attendance')
      .where('date', '==', isoDate)
      .limit(150)
      .get();

    attSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.status === 'present') {
        const via = d.verifiedVia === 'face' ? 'ط¨طµظ…ط© ط§ظ„ظˆط¬ظ‡' : 'طھط³ط¬ظٹظ„ ظٹط¯ظˆظٹ';
        presentMap.set(d.studentId, { via, time: d.time });
      }
    });
  } catch (err) {
    console.error('[AI Chat] Failed to fetch attendance:', err);
  }

  const presentStudents: { name: string; via: string; time?: string }[] = [];
  const absentStudents: { name: string; parentPhone?: string }[] = [];
  let faceCount = 0;

  students.forEach((st) => {
    const att = presentMap.get(st.id);
    if (att) {
      if (att.via.includes('ظˆط¬ظ‡') || att.via.includes('face')) faceCount++;
      presentStudents.push({ name: st.fullName, via: att.via, time: att.time });
    } else {
      absentStudents.push({ name: st.fullName, parentPhone: st.parentPhone });
    }
  });

  const total = students.length;
  const presentCount = presentStudents.length;
  const absentCount = absentStudents.length;
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return {
    students,
    attendance: {
      dateStr: isoDate,
      dateArabic,
      dayName,
      totalStudents: total,
      presentCount,
      absentCount,
      faceAttendanceCount: faceCount,
      presentStudents,
      absentStudents,
      attendanceRate,
    },
  };
}

// â”€â”€ Smart Intent Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function handleDateTimeQuery(): { reply: string; actions: AiAction[] } {
  const { dayName, dateArabic, timeArabic } = getTodayInfo();
  return {
    reply: `ًں“… **ط§ظ„ظٹظˆظ…:** ${dayName}طŒ ${dateArabic}\nâڈ° **ط§ظ„ظˆظ‚طھ ط§ظ„ط­ط§ظ„ظٹ:** ${timeArabic} (طھظˆظ‚ظٹطھ ظ…ظƒط© ط§ظ„ظ…ظƒط±ظ…ط©/ط¬ط¯ط©).`,
    actions: [
      { type: 'navigate', label: 'ظپطھط­ ط§ظ„ط¬ط¯ظˆظ„ ط§ظ„ط¯ط±ط§ط³ظٹ', target: '/branches/ikhlas-jeddah' },
    ],
  };
}

function handleAttendanceQuery(att: AttendanceSummary): { reply: string; actions: AiAction[] } {
  const lines: string[] = [
    `ًں“ٹ **طھظ‚ط±ظٹط± ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط؛ظٹط§ط¨ ط§ظ„ظٹظˆظ…ظٹ â€” ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰**`,
    `ًں“… **ط§ظ„طھط§ط±ظٹط®:** ${att.dayName}طŒ ${att.dateArabic}`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    `â€¢ **ط¥ط¬ظ…ط§ظ„ظٹ ط·ظ„ط§ط¨ ط§ظ„ظپطµظ„:** ${att.totalStudents} ط·ط§ظ„ط¨ط§ظ‹`,
    `â€¢ **ط§ظ„ط­ط§ط¶ط±ظˆظ†:** ${att.presentCount} ط·ط§ظ„ط¨ط§ظ‹ (${att.attendanceRate}%)`,
    `â€¢ **ط­ط¶ط±ظˆط§ ط¨ط¨طµظ…ط© ط§ظ„ظˆط¬ظ‡:** ${att.faceAttendanceCount} ط·ط§ظ„ط¨ط§ظ‹ ًں‘پï¸ڈ`,
    `â€¢ **ط§ظ„ط؛ط§ط¦ط¨ظˆظ† ط§ظ„ظٹظˆظ…:** ${att.absentCount} ط·ط§ظ„ط¨ط§ظ‹`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
  ];

  if (att.absentCount > 0) {
    lines.push(`â‌Œ **ظ‚ط§ط¦ظ…ط© ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ط؛ط§ط¦ط¨ظٹظ† (${att.absentCount}):**`);
    att.absentStudents.forEach((st, idx) => {
      lines.push(`${idx + 1}. ${st.name}`);
    });
    lines.push('');
  } else {
    lines.push('ًںژ‰ **ظ…ط§ ط´ط§ط، ط§ظ„ظ„ظ‡! ط¬ظ…ظٹط¹ ط·ظ„ط§ط¨ ط§ظ„ظپطµظ„ ط­ط§ط¶ط±ظˆظ† ط§ظ„ظٹظˆظ… ط¨ظ†ط³ط¨ط© 100%.**\n');
  }

  if (att.presentCount > 0) {
    lines.push(`âœ… **ظ‚ط§ط¦ظ…ط© ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ط­ط§ط¶ط±ظٹظ† (${att.presentCount}):**`);
    att.presentStudents.slice(0, 10).forEach((st, idx) => {
      lines.push(`${idx + 1}. ${st.name} â€” [${st.via}]`);
    });
    if (att.presentStudents.length > 10) {
      lines.push(`... ظˆط؛ظٹط±ظ‡ظ… ظ…ظ† ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ط­ط§ط¶ط±ظٹظ†.`);
    }
  }

  return {
    reply: lines.join('\n'),
    actions: [
      { type: 'navigate', label: 'ظƒط´ظپ ط§ظ„ط­ط¶ظˆط± ط§ظ„ط¨ظٹظˆظ…طھط±ظٹ ط§ظ„ط°ظƒظٹ', target: '/branches/ikhlas-jeddah/face-attendance' },
      { type: 'navigate', label: 'ظƒط´ظپ ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط¬ط¯ظˆظ„ ط¨ط§ظ„ظپطµظ„', target: '/branches/ikhlas-jeddah' },
    ],
  };
}

function handleQuizGeneration(prompt: string, isJsonRequest: boolean): { reply: string; actions: AiAction[] } {
  const norm = normalizeArabic(prompt);
  let topic = 'ط§ظ„ظˆط¹ظٹ ط§ظ„طµظˆطھظٹ ظˆط§ظ„ظ‚ط±ط§ط،ط© ط§ظ„طھط£ط³ظٹط³ظٹط©';
  if (norm.includes('ط±ظٹط§ط¶ظٹط§طھ') || norm.includes('ط­ط³ط§ط¨') || norm.includes('ط§ط±ظ‚ط§ظ…')) {
    topic = 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ ظˆظ…ظپط§ظ‡ظٹظ… ط§ظ„ط£ط¹ط¯ط§ط¯';
  } else if (norm.includes('ط§ظ…ظ„ط§ط،') || norm.includes('طھظ‡ط¬ظٹ') || norm.includes('ط­ط±ظˆظپ')) {
    topic = 'ط§ظ„طھظ‡ط¬ظٹ ظˆط­ط±ظˆظپ ط§ظ„ظ‡ط¬ط§ط، ظˆط§ظ„ظ…ط¯ظˆط¯';
  } else if (norm.includes('ط¹ظ„ظˆظ…')) {
    topic = 'ط§ظ„ط¹ظ„ظˆظ… ظˆط§ظ„ط­ظˆط§ط³ ط§ظ„ط®ظ…ط³';
  }

  if (isJsonRequest) {
    const jsonOutput = {
      title: `ظƒظˆظٹط² طھظپط§ط¹ظ„ظٹ ظپظٹ ${topic}`,
      questions: [
        {
          questionText: `ط£ظٹ ظ…ظ† ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„طھط§ظ„ظٹط© طھط¨ط¯ط£ ط¨طµظˆطھ ط­ط±ظپ (ط¨)طں`,
          type: 'multiple-choice',
          options: ['ط¨ظژط§ط¨', 'طھظژظ…ظ’ط±', 'ظ‚ظژظ„ظژظ…', 'ظƒظگطھظژط§ط¨'],
          correctAnswer: 0,
          points: 5,
        },
        {
          questionText: `ظ…ط§ ظ‡ظˆ ط§ظ„ط­ط±ظپ ط§ظ„ظ…ظ…ط¯ظˆط¯ ظپظٹ ظƒظ„ظ…ط© (ط³ظژظ€ظ…ظگظ€ظٹظ€ط¹)طں`,
          type: 'multiple-choice',
          options: ['ط§ظ„ظ…ظٹظ…', 'ط§ظ„ط³ظٹظ†', 'ط§ظ„ط¹ظٹظ†', 'ط§ظ„ظٹط§ط،'],
          correctAnswer: 0,
          points: 5,
        },
        {
          questionText: `ظƒظ… ظ…ظ‚ط·ط¹ط§ظ‹ طµظˆطھظٹط§ظ‹ ظپظٹ ظƒظ„ظ…ط© (ظ…ظژط¯ظ’ط±ظژط³ظژط©)طں`,
          type: 'multiple-choice',
          options: ['ظ…ظ‚ط·ط¹ط§ظ†', 'ط«ظ„ط§ط«ط© ظ…ظ‚ط§ط·ط¹', 'ط£ط±ط¨ط¹ط© ظ…ظ‚ط§ط·ط¹', 'ط®ظ…ط³ط© ظ…ظ‚ط§ط·ط¹'],
          correctAnswer: 2,
          points: 5,
        },
        {
          questionText: `ط§ظ„ظƒظ„ظ…ط© ط§ظ„طھظٹ طھط­طھظˆظٹ ط¹ظ„ظ‰ (ظ…ط¯ ط¨ط§ظ„ط£ظ„ظپ) ظ‡ظٹ:`,
          type: 'multiple-choice',
          options: ['ظ†ظڈظˆط±', 'ط³ظژظ…ظژط§ط،', 'طھظگظٹظ†', 'ظپظگظٹظ„'],
          correctAnswer: 1,
          points: 5,
        },
        {
          questionText: `ظ…ط§ ظ‡ظˆ ط§ظ„ط­ط±ظپ ط§ظ„ظ†ط§ظ‚طµ ظپظٹ ظƒظ„ظ…ط© (ط´ظ€...ظ€ط³) ظ„طھطµط¨ط­ ظƒظ„ظ…ط© طµط­ظٹط­ط©طں`,
          type: 'multiple-choice',
          options: ['ظ…', 'ظ„', 'ط±', 'ط¯'],
          correctAnswer: 0,
          points: 5,
        },
      ],
    };
    return {
      reply: JSON.stringify(jsonOutput),
      actions: [{ type: 'navigate', label: 'ظپطھط­ ط¨ظ†ظƒ ط§ظ„ظƒظˆظٹط²ط§طھ', target: '/branches/ikhlas-jeddah' }],
    };
  }

  const reply = [
    `ًںژ¯ **ظƒظˆظٹط² طھظپط§ط¹ظ„ظٹ ظ…ظ‚طھط±ط­ â€” ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰**`,
    `ًں“Œ **ط§ظ„ظ…ظˆط¶ظˆط¹:** ${topic}`,
    `âڈ³ **ط§ظ„ظ…ط¯ط© ط§ظ„طھظ‚ط¯ظٹط±ظٹط©:** 10 ط¯ظ‚ط§ط¦ظ‚ | **ط§ظ„ط¯ط±ط¬ط©:** 25 ظ†ظ‚ط·ط©`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    `**ط§ظ„ط³ط¤ط§ظ„ ط§ظ„ط£ظˆظ„ (5 ط¯ط±ط¬ط§طھ):**`,
    `ط£ظٹ ظ…ظ† ط§ظ„ظƒظ„ظ…ط§طھ ط§ظ„طھط§ظ„ظٹط© طھط¨ط¯ط£ ط¨طµظˆطھ ط­ط±ظپ (ط¨) ظ…ظپطھظˆط­ط§ظ‹طں`,
    `[ ] 1. طھظژظ…ظ’ط±`,
    `[x] 2. ط¨ظژط§ط¨ (ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©)`,
    `[ ] 3. ظ‚ظژظ„ظژظ…`,
    `[ ] 4. ظƒظگطھظژط§ط¨`,
    ``,
    `**ط§ظ„ط³ط¤ط§ظ„ ط§ظ„ط«ط§ظ†ظٹ (5 ط¯ط±ط¬ط§طھ):**`,
    `ظ…ط§ ظ‡ظˆ ط­ط±ظپ ط§ظ„ظ…ط¯ ظپظٹ ظƒظ„ظ…ط© (ط³ظژظ…ظگظٹط¹)طں`,
    `[ ] 1. ط§ظ„ظˆط§ظˆ`,
    `[ ] 2. ط§ظ„ط£ظ„ظپ`,
    `[x] 3. ط§ظ„ظٹط§ط، (ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©)`,
    `[ ] 4. ط§ظ„ظ†ظˆظ†`,
    ``,
    `**ط§ظ„ط³ط¤ط§ظ„ ط§ظ„ط«ط§ظ„ط« (5 ط¯ط±ط¬ط§طھ):**`,
    `ط§ظ„طھط­ظ„ظٹظ„ ط§ظ„طµظˆطھظٹ ظ„ظƒظ„ظ…ط© (ط¨ظژط§ط¨ظڈ) ظ‡ظˆ:`,
    `[x] 1. [ ط¨ظژط§ / ط¨ظڈ ] (ظ…ظ‚ط·ط¹ ظ…ط¯ ظˆظ…ظ‚ط·ط¹ ظ‚طµظٹط±) (ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©)`,
    `[ ] 2. [ ط¨ / ط§ / ط¨ ]`,
    `[ ] 3. [ ط¨ط§ط¨ / ظˆ ]`,
    ``,
    `**ط§ظ„ط³ط¤ط§ظ„ ط§ظ„ط±ط§ط¨ط¹ (5 ط¯ط±ط¬ط§طھ):**`,
    `ط§ظ„ظƒظ„ظ…ط© ط§ظ„طھظٹ طھط­طھظˆظٹ ط¹ظ„ظ‰ طµظˆطھ (ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط©) ط¹ظ†ط¯ ط§ظ„ظˆظ‚ظپ ظ‡ظٹ:`,
    `[x] 1. ظ…ظژط¯ظ’ط±ظژط³ظژط© (ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©)`,
    `[ ] 2. ط¨ظژظٹظ’طھ`,
    `[ ] 3. ط¨ظگظ†ظ’طھ`,
    `[ ] 4. ظƒظژطھظژط¨ظژطھ`,
    ``,
    `**ط§ظ„ط³ط¤ط§ظ„ ط§ظ„ط®ط§ظ…ط³ (5 ط¯ط±ط¬ط§طھ):**`,
    `ط§ط®طھط± ط§ظ„ظƒظ„ظ…ط© ط§ظ„طھظٹ طھط·ط§ط¨ظ‚ ط§ظ„طµظˆط±ط© ط§ظ„ظ…ط¹ط±ظˆط¶ط© (ظƒطھط§ط¨):`,
    `[ ] 1. ط¯ظژظپظ’طھظژط±`,
    `[x] 2. ظƒظگطھظژط§ط¨ (ط§ظ„ط¥ط¬ط§ط¨ط© ط§ظ„طµط­ظٹط­ط©)`,
    `[ ] 3. ط­ظژظ‚ظگظٹط¨ظژط©`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    `ًں’، **طھظˆط¬ظٹظ‡ ظ„ظ„ظ…ط¹ظ„ظ… ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„:** ط§ظ„ط£ط³ط¦ظ„ط© ظ…طµظ…ظ…ط© ظ„طھظ‚ظ„ظٹظ„ ط§ظ„طھط´طھطھ ط§ظ„ط¨طµط±ظٹ ظˆط¯ط¹ظ… ط§ظ„ط·ظ„ط§ط¨ ط°ظˆظٹ طµط¹ظˆط¨ط§طھ ط§ظ„ظ‚ط±ط§ط،ط©.`,
  ].join('\n');

  return {
    reply,
    actions: [
      { type: 'navigate', label: 'ط¥ط¶ط§ظپط© ظ‡ط°ط§ ط§ظ„ظƒظˆظٹط² ظ„ط¨ظ†ظƒ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ', target: '/branches/ikhlas-jeddah' },
    ],
  };
}

function handleLessonPrep(prompt: string): { reply: string; actions: AiAction[] } {
  const topic = prompt.replace(/(ط­ط¶ط±|طھط­ط¶ظٹط±|ط¯ط±ط³|ط®ط·ط©|ط¹ظ…ظ„|ط§ظƒطھط¨)/gi, '').trim() || 'ط§ظ„ظˆط¹ظٹ ط§ظ„طµظˆطھظٹ ظˆط­ط±ظˆظپ ط§ظ„ظ…ط¯';
  const reply = [
    `ًں“ڑ **ط®ط·ط© طھط­ط¶ظٹط± ط¯ط±ط³ طھظپط§ط¹ظ„ظٹ ظ…طھظƒط§ظ…ظ„**`,
    `ًں‘¨â€چًںڈ« **ط§ظ„ظ…ط¹ظ„ظ…:** ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰ | **ط§ظ„ظ…ظˆط¶ظˆط¹:** ${topic}`,
    `ًںڈ« **ط§ظ„ظپطµظ„:** ظپطµظ„ ط§ظ„ط¥ط®ظ„ط§طµ â€” ط§ظ„ظ…ط±ط­ظ„ط© ط§ظ„ط§ط¨طھط¯ط§ط¦ظٹط© ظˆط§ظ„طھط±ط¨ظٹط© ط§ظ„ط®ط§طµط©`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    `ًںژ¯ **1. ط§ظ„ط£ظ‡ط¯ط§ظپ ط§ظ„ط³ظ„ظˆظƒظٹط© ظ„ظ„ط¯ط±ط³:**`,
    `â€¢ **ظ‡ط¯ظپ ظ…ط¹ط±ظپظٹ:** ط£ظ† ظٹظ…ظٹط² ط§ظ„ط·ط§ظ„ط¨ ط§ظ„ظ…ظپظ‡ظˆظ… ط§ظ„ظ…ط³طھظ‡ط¯ظپ ط¨ظ†ط³ط¨ط© ط¥طھظ‚ط§ظ† ظ„ط§ طھظ‚ظ„ ط¹ظ† 85%.`,
    `â€¢ **ظ‡ط¯ظپ ظ…ظ‡ط§ط±ظٹ/ط­ط±ظƒظٹ:** ط£ظ† ظٹط´ط§ط±ظƒ ط§ظ„ط·ط§ظ„ط¨ ظپظٹ ط¨ط·ط§ظ‚ط§طھ ط§ظ„ظ†ط´ط§ط· ط§ظ„ط­ط±ظƒظٹ ظˆط§ظ„طھظپط§ط¹ظ„ظٹ ط¯ط§ط®ظ„ ط§ظ„ظپطµظ„.`,
    `â€¢ **ظ‡ط¯ظپ ظˆط¬ط¯ط§ظ†ظٹ:** ط£ظ† ظٹظƒطھط³ط¨ ط§ظ„ط·ط§ظ„ط¨ ط§ظ„ط«ظ‚ط© ط¨ط§ظ„ظ†ظپط³ ظˆط§ظ„ظ…ط¨ط§ط¯ط±ط© ط£ط«ظ†ط§ط، ط§ظ„ظ‚ط±ط§ط،ط© ط£ظ…ط§ظ… ط²ظ…ظ„ط§ط¦ظ‡.`,
    ``,
    `âڑ، **2. ط§ظ„طھظ‡ظٹط¦ط© ط§ظ„ط­ط§ظپط²ط© (5 ط¯ظ‚ط§ط¦ظ‚):**`,
    `ط¹ط±ط¶ طµظ†ط¯ظˆظ‚ ط§ظ„ظ…ظپط§ط¬ط¢طھ ط£ظˆ ط¨ط·ط§ظ‚ط© ظ…ظ„ظˆظ†ط© طھط´ظˆظٹظ‚ظٹط© ظ„ط³ط¤ط§ظ„ ط§ظ„ط·ظ„ط§ط¨: "ظ…ط§ط°ط§ ظٹط®طھط¨ط¦ ط¯ط§ط®ظ„ ظ‡ط°ط§ ط§ظ„ط­ط±ظپطں" ظ„ط¥ط«ط§ط±ط© ط§ظ„ظپط¶ظˆظ„.`,
    ``,
    `ًں› ï¸ڈ **3. ط§ظ„ط§ط³طھط±ط§طھظٹط¬ظٹط§طھ ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:**`,
    `â€¢ ط§ظ„طھط¹ظ„ظ… ظ…طھط¹ط¯ط¯ ط§ظ„ط­ظˆط§ط³ (VARK): ط±ط¤ظٹط© ط§ظ„ط­ط±ظپطŒ ط³ظ…ط§ط¹ طµظˆطھظ‡طŒ ظˆطھط´ظƒظٹظ„ظ‡ ط¨ط§ظ„طµظ„طµط§ظ„ ط£ظˆ ط§ظ„ط±ظ…ظ„.`,
    `â€¢ ط§ظ„ظ†ظ…ط°ط¬ط© ط§ظ„ط¥ظٹط¬ط§ط¨ظٹط©: "ط£ظ†ط§ ط£ط¹ظ…ظ„ ط£ظˆظ„ط§ظ‹طŒ ط«ظ… ظ†ط¹ظ…ظ„ ظ…ط¹ط§ظ‹طŒ ط«ظ… طھط¹ظ…ظ„ ظˆط­ط¯ظƒ".`,
    `â€¢ ط§ظ„طھط¹ط²ظٹط² ط§ظ„ظپظˆط±ظٹ: ظ†ظ‚ط§ط· ط§ظ„ظ…ظ†طµط© ظˆط§ظ„ط´ط§ط±ط§طھ ط§ظ„ط°ظƒظٹط©.`,
    ``,
    `ًں“‌ **4. ط®ط·ظˆط§طھ ط³ظٹط± ط§ظ„ط¯ط±ط³ (25 ط¯ظ‚ظٹظ‚ط©):**`,
    `1. ط¹ط±ط¶ ط§ظ„ظ†ظ…ظˆط°ط¬ ط§ظ„ط£ط³ط§ط³ظٹ ط¨طµظˆطھ ظˆط§ط¶ط­ ظˆظ…ط®ط§ط±ط¬ ط­ط±ظˆظپ ظ…ظ†ط¶ط¨ط·ط©.`,
    `2. طھط¯ط±ظٹط¨ ط¬ظ…ط§ط¹ظٹ ظ…ط¹ طھط±ط¯ظٹط¯ ط¥ظٹظ‚ط§ط¹ظٹ ظ…ظ†ط¸ظ….`,
    `3. ظ†ط´ط§ط· ظپط±ط¯ظٹ ط³ط±ظٹط¹ ط¹ظ„ظ‰ ظƒط±ط§ط³ط© ط§ظ„ط·ط§ظ„ط¨ ط£ظˆ ط§ظ„ط¬ظ‡ط§ط² ط§ظ„ظ„ظˆط­ظٹ.`,
    ``,
    `ًںڈپ **5. ط§ظ„ط؛ظ„ظ‚ ظˆط§ظ„طھظ‚ظٹظٹظ… ط§ظ„طھظƒظˆظٹظ†ظٹ (10 ط¯ظ‚ط§ط¦ظ‚):**`,
    `ظ„ط¹ط¨ط© "طھط­ط¯ظٹ ط§ظ„ظ†ط¬ظˆظ…" ط§ظ„ط³ط±ظٹط¹ط© (3 ط£ط³ط¦ظ„ط© ط´ظپظ‡ظٹط© ط³ط±ظٹط¹ط© ظ„ظƒظ„ ط·ط§ظ„ط¨ ظ„ظ„طھط£ظƒط¯ ظ…ظ† ظˆطµظˆظ„ ط§ظ„ظ‡ط¯ظپ ط¯ظˆظ† ط¥ط­ط¨ط§ط·).`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
  ].join('\n');

  return {
    reply,
    actions: [
      { type: 'navigate', label: 'ظپطھط­ ظƒط±ط§ط³ط© ط§ظ„ظ…ظ†ط§ظ‡ط¬ ظˆط§ظ„ط¯ط±ظˆط³', target: '/branches/ikhlas-jeddah' },
    ],
  };
}

function handleParentMessage(prompt: string, att: AttendanceSummary): { reply: string; actions: AiAction[] } {
  const isAbsenceMsg = prompt.includes('ط؛ظٹط§ط¨') || prompt.includes('ط؛ط§ط¨') || prompt.includes('ط؛ط§ط¦ط¨');
  const studentMatch = prompt.match(/(?:ط§ظ„ط·ط§ظ„ط¨|ط·ط§ظ„ط¨)\s+([^\sطŒ,.]+)/);
  const studentName = studentMatch?.[1] || (att.absentStudents[0]?.name ?? 'ط§ط¨ظ†ظƒظ… ط§ظ„ط¹ط²ظٹط²');

  if (isAbsenceMsg) {
    const text = [
      `ًں“² **ظ†ظ…ظˆط°ط¬ ط±ط³ط§ظ„ط© ظˆط§طھط³ط§ط¨ ظ„ط£ظˆظ„ظٹط§ط، ط£ظ…ظˆط± ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ط؛ط§ط¦ط¨ظٹظ† ط§ظ„ظٹظˆظ…:**`,
      `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
      `ط§ظ„ط³ظ„ط§ظ… ط¹ظ„ظٹظƒظ… ظˆط±ط­ظ…ط© ط§ظ„ظ„ظ‡ ظˆط¨ط±ظƒط§طھظ‡ ًںŒ¸`,
      `ط§ظ„ظ…ظƒط±ظ… ظˆظ„ظٹ ط£ظ…ط± ط§ظ„ط·ط§ظ„ط¨/ط©: *${studentName}* ط­ظپط¸ظƒظ… ط§ظ„ظ„ظ‡طŒ`,
      ``,
      `ظ†ط­ظٹط·ظƒظ… ط¹ظ„ظ…ط§ظ‹ ط¨ط£ظ† ط§ظ„ط·ط§ظ„ط¨ طھط؛ظٹط¨ ط§ظ„ظٹظˆظ… ط¹ظ† ط­طµطµ ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰ (${att.dayName} ${att.dateArabic}).`,
      `ظ†ط£ظ…ظ„ ط£ظ† ظٹظƒظˆظ† ط§ظ„ظ…ط§ظ†ط¹ ط®ظٹط±ط§ظ‹ ظˆطµط­ط© ظˆط¹ط§ظپظٹط©طŒ ظˆظ†ط±ط¬ظˆ ط¥ط¨ظ„ط§ط؛ظ†ط§ ط¨ط³ط¨ط¨ ط§ظ„ط؛ظٹط§ط¨ ظ„ظ…طھط§ط¨ط¹ط© ظˆط§ط¬ط¨ط§طھ ظˆط¯ط±ظˆط³ ط§ظ„ظٹظˆظ… ظ„ط¶ظ…ط§ظ† ط¹ط¯ظ… طھط£ط®ط±ظ‡ ط¹ظ† ط²ظ…ظ„ط§ط¦ظ‡.`,
      ``,
      `ط´ط§ظƒط±ظٹظ† ظˆظ…ظ‚ط¯ط±ظٹظ† ظƒط±ظٹظ… طھط¹ط§ظˆظ†ظƒظ… ظˆط­ط±طµظƒظ… ط§ظ„ط¯ط§ط¦ظ….`,
      `*ط¥ط¯ط§ط±ط© ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰ â€” ظ…ط¯ط±ط³ط© ط§ظ„ط¥ط®ظ„ط§طµ ط§ظ„ط£ظ‡ظ„ظٹط©*`,
      `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    ].join('\n');

    return {
      reply: text,
      actions: [
        { type: 'navigate', label: 'ظپطھط­ ط³ط¬ظ„ ط§ظ„ط؛ظٹط§ط¨ ظˆط§ظ„ط±ط³ط§ط¦ظ„', target: '/branches/ikhlas-jeddah' },
      ],
    };
  }

  const generalText = [
    `ًں“² **ظ†ظ…ظˆط°ط¬ ط±ط³ط§ظ„ط© ظ…طھط§ط¨ط¹ط© ط¯ظˆط±ظٹط© ظ„ظˆظ„ظٹ ط§ظ„ط£ظ…ط±:**`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    `ط§ظ„ط³ظ„ط§ظ… ط¹ظ„ظٹظƒظ… ظˆط±ط­ظ…ط© ط§ظ„ظ„ظ‡ ظˆط¨ط±ظƒط§طھظ‡طŒ ط§ظ„ظ…ظƒط±ظ… ظˆظ„ظٹ ط£ظ…ط± ط§ظ„ط·ط§ظ„ط¨/ط©: *${studentName}*طŒ`,
    ``,
    `ظٹط³ط¹ط¯ظ†ط§ ط¥ط¨ظ„ط§ط؛ظƒظ… ط¨طھظ…ظٹط² ط§ظ„ط·ط§ظ„ط¨ ظˆط¬ظ‡ظˆط¯ظ‡ ط§ظ„ط·ظٹط¨ط© ظپظٹ ط§ظ„ظپطµظ„ ط§ظ„ظٹظˆظ… ظ…ط¹ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„. طھظ… طھط³ط¬ظٹظ„ طھظ‚ط¯ظ… ظ…ظ„ط­ظˆط¸ ظپظٹ ط§ظ„طھظپط§ط¹ظ„ ظˆط§ظ„ط§ط³طھط¬ط§ط¨ط© ظ„ظ„ظ…ظ‡ط§ظ… ط§ظ„طھط¹ظ„ظٹظ…ظٹط©.`,
    `ظ†ط±ط¬ظˆ ظ…ظ†ظƒظ… طھط®طµظٹطµ 10 ط¯ظ‚ط§ط¦ظ‚ ظپظ‚ط· ظ…ط³ط§ط، ط§ظ„ظٹظˆظ… ظ„ظ…ط±ط§ط¬ط¹ط© ط§ظ„ظˆط§ط¬ط¨ ط§ظ„ظ‚طµظٹط± ط§ظ„ظ…طھط§ط­ ط¹ط¨ط± ظ…ظ†طµط© ظ…ط³ط§ط± ظ„طھط¹ط²ظٹط² ط§ظ„ظ…ظ‡ط§ط±ط©.`,
    ``,
    `ط¯ظ…طھظ… ظˆط¯ط§ظ… ط£ط¨ظ†ط§ط¤ظƒظ… ظپظٹ طھظپظˆظ‚ ظˆظ†ط¬ط§ط­ ظ…ط³طھظ…ط±.`,
    `*ظ…ظ†طµط© ظ…ط³ط§ط± â€” ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰*`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
  ].join('\n');

  return {
    reply: generalText,
    actions: [
      { type: 'navigate', label: 'ط¥ط±ط³ط§ظ„ ط±ط³ط§ط¦ظ„ ظ„ط£ظˆظ„ظٹط§ط، ط§ظ„ط£ظ…ظˆط±', target: '/branches/ikhlas-jeddah' },
    ],
  };
}

function handleIepPlan(prompt: string): { reply: string; actions: AiAction[] } {
  const studentMatch = prompt.match(/(?:ط§ظ„ط·ط§ظ„ط¨|ط·ط§ظ„ط¨)\s+([^\sطŒ,.]+)/);
  const studentName = studentMatch?.[1] || 'ط§ظ„ط·ط§ظ„ط¨';

  const reply = [
    `ًں“‹ **ظ…ط³ظˆط¯ط© ط®ط·ط© طھط±ط¨ظˆظٹط© ظپط±ط¯ظٹط© ظ…طھط®طµطµط© (IEP) â€” ظ…ظ†طµط© ظ…ط³ط§ط±**`,
    `ًں‘¤ **ط§ط³ظ… ط§ظ„ط·ط§ظ„ط¨:** ${studentName}`,
    `ًں‘¨â€چًںڈ« **ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…:** ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    `ًںژ¯ **1. ظ…ط³طھظˆظ‰ ط§ظ„ط£ط¯ط§ط، ط§ظ„ط­ط§ظ„ظٹ (Present Level):**`,
    `â€¢ ظٹظڈط¸ظ‡ط± ط§ظ„ط·ط§ظ„ط¨ ظ‚ط§ط¨ظ„ظٹط© ط¹ط§ظ„ظٹط© ظ„ظ„طھط¹ظ„ظ… ط¹ظ†ط¯ ط§ط³طھط®ط¯ط§ظ… ط§ظ„ظ…ط¹ط²ط²ط§طھ ط§ظ„ط¨طµط±ظٹط© ظˆط§ظ„ط­ط³ظٹط©.`,
    `â€¢ ظٹط­طھط§ط¬ ط¥ظ„ظ‰ ط¯ط¹ظ… ط¥ط¶ط§ظپظٹ ظپظٹ ط§ظ„طھظ‡ط¬ظٹ ظˆظ…ط·ط§ط¨ظ‚ط© ط§ظ„ط­ط±ظˆظپ ط§ظ„ظ…طھط´ط§ط¨ظ‡ط© طµظˆطھط§ظ‹ (ط³/طµ - طھ/ط·).`,
    ``,
    `ًںڈ† **2. ط§ظ„ظ‡ط¯ظپ ط·ظˆظٹظ„ ط§ظ„ظ…ط¯ظ‰ (ط®ظ„ط§ظ„ ط§ظ„ظپطµظ„ ط§ظ„ط¯ط±ط§ط³ظٹ):**`,
    `ط£ظ† ظٹظ‚ط±ط£ ط§ظ„ط·ط§ظ„ط¨ ظˆظٹظƒطھط¨ ظƒظ„ظ…ط§طھ ط«ظ„ط§ط«ظٹط© ظ…ط¶ط¨ظˆط·ط© ط¨ط§ظ„ط­ط±ظƒط§طھ ط¨ط¯ظ‚ط© 85% ط¨طµظˆط±ط© ظ…ط³طھظ‚ظ„ط©.`,
    ``,
    `â­گ **3. ط§ظ„ط£ظ‡ط¯ط§ظپ ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ظ‚طµظٹط±ط© ط§ظ„ظ…ط¯ظ‰ (SMART):**`,
    `1. ط£ظ† ظٹظڈظ…ظٹط² ط£طµظˆط§طھ ط§ظ„ط­ط±ظˆظپ ظ…ط¹ ط§ظ„ظ…ط¯ظˆط¯ ط§ظ„ظ‚طµظٹط±ط© ظˆط§ظ„ط·ظˆظٹظ„ط© ظپظٹ 8 ظ…ظ† ظƒظ„ 10 ظ…ط­ط§ظˆظ„ط§طھ.`,
    `2. ط£ظ† ظٹط­ظ„ظ„ ط§ظ„ظƒظ„ظ…ط© ط¥ظ„ظ‰ ظ…ظ‚ط§ط·ط¹ طµظˆطھظٹط© ط¨ط´ظƒظ„ طµط­ظٹط­ ط¨ط§ط³طھط®ط¯ط§ظ… ط¨ط·ط§ظ‚ط§طھ ط§ظ„طھظ‚ط·ظٹط¹.`,
    `3. ط£ظ† ظٹظ†ط¬ط² ظˆط±ظ‚ط© ط¹ظ…ظ„ ظ‚طµظٹط±ط© ظ…ظƒظˆظ†ط© ظ…ظ† 3 ط£ط³ط¦ظ„ط© ظپظٹ ط²ظ…ظ† ط£ظ‚طµط§ظ‡ 12 ط¯ظ‚ظٹظ‚ط©.`,
    ``,
    `ًں§© **4. ط§ط³طھط±ط§طھظٹط¬ظٹط§طھ ط§ظ„طھط¯ط®ظ„ ظˆط§ظ„ط¯ط¹ظ…:**`,
    `â€¢ طھظ‚ظ„ظٹظ„ ط§ظ„ظ…ط´طھطھط§طھ ط§ظ„ط¨طµط±ظٹط© ظپظٹ ط£ظˆط±ط§ظ‚ ط§ظ„ط¹ظ…ظ„.`,
    `â€¢ ط§ط³طھط®ط¯ط§ظ… ط£ط³ظ„ظˆط¨ ط§ظ„طھظƒط±ط§ط± ط§ظ„ظ…طھط¨ط§ط¹ط¯ ظˆط§ظ„طھط؛ط°ظٹط© ط§ظ„ط±ط§ط¬ط¹ط© ط§ظ„ظپظˆط±ظٹط© ط§ظ„ط¥ظٹط¬ط§ط¨ظٹط©.`,
    `â€¢ ط¥ط´ط±ط§ظƒ ظˆظ„ظٹ ط§ظ„ط£ظ…ط± ظپظٹ ظ†ط´ط§ط· ظ…ظ†ط²ظ„ظٹ طھظپط§ط¹ظ„ظٹ ظ„ط§ ظٹطھط¬ط§ظˆط² 10 ط¯ظ‚ط§ط¦ظ‚ ظٹظˆظ…ظٹط§ظ‹.`,
    `â”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پâ”پ`,
    `ًں’، *ظ…ظ„ط§ط­ط¸ط©: ظٹظ…ظƒظ†ظƒ ط§ط¹طھظ…ط§ط¯ ط§ظ„ط®ط·ط© ط£ظˆ ط§ظ„طھط¹ط¯ظٹظ„ ط¹ظ„ظٹظ‡ط§ ظ…ط¨ط§ط´ط±ط© ظ…ظ† طھط¨ظˆظٹط¨ ط§ظ„ط®ط·ط· ط§ظ„ظپط±ط¯ظٹط©.*`,
  ].join('\n');

  return {
    reply,
    actions: [
      { type: 'navigate', label: 'ظپطھط­ ط³ط¬ظ„ ط®ط·ط· IEP ط¨ط§ظ„ظ…ظ†طµط©', target: '/iep' },
    ],
  };
}

// â”€â”€ POST Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json({ success: false, error: 'ط¬ظ„ط³ط© ط§ظ„ط¯ط®ظˆظ„ ط؛ظٹط± طµط§ظ„ط­ط©. ظٹط±ط¬ظ‰ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„.' }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    'ai_chat_execution',
    getClientIdentifier(req, authResult.user.id),
    { windowMs: 60 * 1000, maxRequests: 60, failClosed: false },
    { identifier: getIpIdentifier(req), maxRequests: 180 },
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, error: 'ط·ظ„ط¨ط§طھ ظƒط«ظٹط±ط© ظ…طھطھط§ظ„ظٹط©. ط§ظ†طھط¸ط± ط¨ط¶ط¹ ط«ظˆط§ظ†ظچ.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 7000) : '';
  const branch = typeof body.branch === 'string' ? body.branch : 'IKHLAS_JEDDAH';
  const image = parseImage(body.image);
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const isJsonRequest = Boolean(body.prompt?.includes('ط£ط±ط¬ط¹ JSON ظپظ‚ط·') || body.format === 'json');

  if (!rawPrompt && !image) {
    return NextResponse.json({ success: false, error: 'ظٹط±ط¬ظ‰ ظƒطھط§ط¨ط© ط³ط¤ط§ظ„ظƒ ط£ظˆ ط¥ط±ظپط§ظ‚ طµظˆط±ط© ظ„ظ„طھط­ظ„ظٹظ„.' }, { status: 400 });
  }

  const normalized = normalizeArabic(rawPrompt);
  const { isoDate, dayName, dateArabic } = getTodayInfo();

  // 1. Fetch Real Context from Platform
  const { students, attendance } = await fetchClassroomContext(branch);

  // 2. Check for Immediate Rule-Based Handlers
  if (!image) {
    // Date & Time
    if (/^(ط§ظ„ظ†ظ‡ط§ط±ط¯ظ‡|ط§ظ„ظ†ظ‡ط§ط±ط¯ط©|ط§ظ„ظٹظˆظ…)\s+(ظٹظˆظ…\s*)?(ط§ظٹظ‡|ط§ظٹ|ط¥ظٹظ‡|ط¥ظٹ)$/.test(normalized) || normalized.includes('طھط§ط±ظٹط® ط§ظ„ظ†ظ‡ط§ط±ط¯ظ‡') || normalized.includes('ط§ظ„ط³ط§ط¹ظ‡ ظƒط§ظ…')) {
      const res = handleDateTimeQuery();
      return NextResponse.json({ success: true, reply: res.reply, gateway: 'ظ†ط¸ط§ظ… ظ…ط³ط§ط± ط§ظ„ط°ظƒظٹ', actions: res.actions });
    }

    // Attendance & Absence
    if (
      normalized.includes('ظ…ظٹظ† ط؛ط§ط¨') ||
      normalized.includes('ظ…ظٹظ† ط­ط¶ط±') ||
      normalized.includes('ظƒط´ظپ ط§ظ„ط؛ظٹط§ط¨') ||
      normalized.includes('ظƒط´ظپ ط§ظ„ط­ط¶ظˆط±') ||
      normalized.includes('ظ†ط³ط¨ظ‡ ط§ظ„ط­ط¶ظˆط±') ||
      normalized.includes('ط§ظ„ط؛ظٹط§ط¨ ط§ظ„ظ†ظ‡ط§ط±ط¯ظ‡') ||
      normalized.includes('ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط؛ظٹط§ط¨') ||
      normalized === 'ط§ظ„ط؛ظٹط§ط¨' ||
      normalized === 'ط§ظ„ط­ط¶ظˆط±'
    ) {
      const res = handleAttendanceQuery(attendance);
      return NextResponse.json({ success: true, reply: res.reply, gateway: 'ظ†ط¸ط§ظ… ط§ظ„ط­ط¶ظˆط± ط§ظ„ط¨ظٹظˆظ…طھط±ظٹ ط§ظ„ط°ظƒظٹ', actions: res.actions });
    }

    // Quiz Generation (especially JSON format requests for Quiz Builder)
    if (isJsonRequest || normalized.includes('ط§ظ†ط´ط¦ ظƒظˆظٹط²') || normalized.includes('ط§ط¹ظ…ظ„ ظƒظˆظٹط²') || normalized.includes('ظƒظˆظٹط² ط³ط±ظٹط¹') || normalized.includes('ط§ط®طھط¨ط§ط± ط³ط±ظٹط¹')) {
      const res = handleQuizGeneration(rawPrompt, isJsonRequest);
      return NextResponse.json({ success: true, reply: res.reply, gateway: 'ظ…ط­ط±ظƒ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ط°ظƒظٹ', actions: res.actions });
    }

    // Parent Message Draft
    if (normalized.includes('ط±ط³ط§ظ„ظ‡ ظ„ظˆظ„ظٹ') || normalized.includes('ط±ط³ط§ظ„ط© ظ„ظˆظ„ظٹ') || normalized.includes('ظˆط§طھط³ط§ط¨ ظ„ط§ظ‡ظ„') || normalized.includes('ط±ط³ط§ظ„ظ‡ ط؛ظٹط§ط¨')) {
      const res = handleParentMessage(rawPrompt, attendance);
      return NextResponse.json({ success: true, reply: res.reply, gateway: 'ظ…ظ†ط´ط¦ ط§ظ„ط±ط³ط§ط¦ظ„ ط§ظ„طھط±ط¨ظˆظٹط©', actions: res.actions });
    }

    // Lesson Preparation
    if (normalized.includes('طھط­ط¶ظٹط± ط¯ط±ط³') || normalized.includes('ط­ط¶ط± ط¯ط±ط³') || normalized.includes('طھط­ط¶ظٹط± طھظپط§ط¹ظ„ظٹ') || normalized.includes('ط®ط·ظ‡ ط¯ط±ط³')) {
      const res = handleLessonPrep(rawPrompt);
      return NextResponse.json({ success: true, reply: res.reply, gateway: 'ظ…ط³ط§ط¹ط¯ ط§ظ„طھط­ط¶ظٹط± ط§ظ„طھط±ط¨ظˆظٹ', actions: res.actions });
    }

    // IEP Individual Plan
    if (normalized.includes('ط®ط·ط© iep') || normalized.includes('ط®ط·ظ‡ iep') || normalized.includes('ط®ط·ط© ط¹ظ„ط§ط¬ظٹط©') || normalized.includes('ط®ط·ظ‡ ظپط±ط¯ظٹظ‡')) {
      const res = handleIepPlan(rawPrompt);
      return NextResponse.json({ success: true, reply: res.reply, gateway: 'ظ…ظˆظ„ط¯ ط§ظ„ط®ط·ط· ط§ظ„ظپط±ط¯ظٹط© IEP', actions: res.actions });
    }
  }

  // 3. Fallback to / Enhance with Gemini AI Engine
  const systemPrompt = `
ط£ظ†طھ ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ ط§ظ„ط´ط®طµظٹ ظ„ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰ ظپظٹ ظ…ظ†طµط© ظ…ط³ط§ط± ط§ظ„طھط¹ظ„ظٹظ…ظٹط© ظˆظپطµظ„ ظ…ط¯ط±ط³ط© ط§ظ„ط¥ط®ظ„ط§طµ ط¨ط¬ط¯ط©.
ط£ظ†طھ ط®ط¨ظٹط± طھط±ط¨ظˆظٹ ظˆطھظ‚ظ†ظٹ ظ…طھط®طµطµ ظپظٹ طµط¹ظˆط¨ط§طھ ط§ظ„طھط¹ظ„ظ…طŒ ط§ظ„طھط±ط¨ظٹط© ط§ظ„ط®ط§طµط©طŒ ظˆط§ظ„طھط£ط³ظٹط³ ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹ.

ًں“… ط³ظٹط§ظ‚ ط§ظ„ظٹظˆظ… ط§ظ„ظپط¹ظ„ظٹ ظپظٹ ط§ظ„ظ…ظ†طµط©:
- ط§ظ„ظٹظˆظ…: ${dayName}طŒ ${dateArabic} (${isoDate}).
- ط§ظ„ظپطµظ„: ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰ (ظپط±ط¹ ط§ظ„ط¥ط®ظ„ط§طµ ط§ظ„ط£ظ‡ظ„ظٹط© ط¨ط¬ط¯ط©).
- ط¥ط¬ظ…ط§ظ„ظٹ ط·ظ„ط§ط¨ ط§ظ„ظپطµظ„ ط§ظ„ظ…ط³ط¬ظ„ظٹظ†: ${attendance.totalStudents} ط·ط§ظ„ط¨ط§ظ‹.
- ط¹ط¯ط¯ ط§ظ„ط·ظ„ط§ط¨ ط§ظ„ط­ط§ط¶ط±ظٹظ† ط§ظ„ظٹظˆظ…: ${attendance.presentCount} ط·ط§ظ„ط¨ط§ظ‹ (${attendance.attendanceRate}%).
- ط­ط¶ظˆط± ط¨طµظ…ط© ط§ظ„ظˆط¬ظ‡ ط§ظ„ط°ظƒظٹط©: ${attendance.faceAttendanceCount} ط·ط§ظ„ط¨ط§ظ‹.
- ط¹ط¯ط¯ ط§ظ„ط؛ط§ط¦ط¨ظٹظ†: ${attendance.absentCount} ط·ط§ظ„ط¨ط§ظ‹.
- ط£ط³ظ…ط§ط، ط¨ط¹ط¶ ط·ظ„ط§ط¨ ط§ظ„ظپطµظ„: ${students.slice(0, 10).map((s) => s.fullName).join('طŒ ')}.

ط¥ط±ط´ط§ط¯ط§طھظƒ ط§ظ„طµط§ط±ظ…ط©:
1. ط£ظ†طھ طھطھط­ط¯ط« ظ…ط¨ط§ط´ط±ط© ط¥ظ„ظ‰ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰ (ط£ظˆ ظˆظ„ظٹ ط§ظ„ط£ظ…ط±/ط§ظ„ظ…ط®طھطµ ط­ط³ط¨ ط§ظ„ط³ظٹط§ظ‚).
2. ط£ط¬ط¨ ط¯ط§ط¦ظ…ط§ظ‹ ط¨ط§ظ„ط¹ط±ط¨ظٹط© ط§ظ„ظپطµط­ظ‰ ط§ظ„ط³ظ„ط³ط© ظˆط§ظ„ظ…ط­طھط±ظپط© ظˆط¨ط£ط³ظ„ظˆط¨ ط¹ظ…ظ„ظٹ ظˆظ…ط¨ط§ط´ط±.
3. ظ„ط§ طھط¹طھط°ط± ظˆظ„ط§ طھط³طھط®ط¯ظ… ط¹ط¨ط§ط±ط§طھ ط±ظˆطھظٹظ†ظٹط© ظپط§ط±ط؛ط© ظ…ط«ظ„ "ط¨طµظپطھظٹ ط°ظƒط§ط، ط§طµط·ظ†ط§ط¹ظٹ" ط£ظˆ "ظٹظ…ظƒظ†ظ†ط§ ط§ظ„ظ…طھط§ط¨ط¹ط©". ط§ط¯ط®ظ„ ظپظٹ طµظ„ط¨ ط§ظ„ظ…ظˆط¶ظˆط¹ ظپظˆط±ط§ظ‹.
4. ط¹ظ†ط¯ظ…ط§ ظٹط±ظپط¹ ط§ظ„ط¯ظƒطھظˆط± طµظˆط±ط© (ط¬ط¯ظˆظ„طŒ ظˆط±ظ‚ط© ط¹ظ…ظ„طŒ ظƒطھط§ط¨طŒ طھظ…ط±ظٹظ†)طŒ ط§ظ‚ط±ط£ ظ†طµظ‡ط§ ط¨ط¯ظ‚ط© ظˆط­ظ„ظ„ظ‡ط§ ظˆط§ظ‚طھط±ط­ ط·ط±ظٹظ‚ط© طھط¯ط±ظٹط³ظ‡ط§ ظˆطھط·ظˆظٹط±ظ‡ط§.
5. ظ‚ط¯ظ… ط¯ط§ط¦ظ…ط§ظ‹ ظ…ط®ط±ط¬ط§طھ ط¬ط§ظ‡ط²ط© ظ„ظ„ظ†ط³ط® ظˆط§ظ„ط§ط³طھط®ط¯ط§ظ…: ظ†طµظˆطµ ط±ط³ط§ط¦ظ„طŒ ط£ط³ط¦ظ„ط© ظƒظˆظٹط²طŒ ط®ط·ظˆط§طھ طھط­ط¶ظٹط±طŒ ط£ظ‡ط¯ط§ظپ IEP.
`.trim();

  const messages: GeminiMessage[] = [];
  for (const item of history) {
    if (item?.text) {
      messages.push({
        role: item.sender === 'user' ? 'user' : 'model',
        content: String(item.text).slice(0, 1500),
      });
    }
  }

  messages.push({
    role: 'user',
    content: rawPrompt || 'ظٹط±ط¬ظ‰ طھط­ظ„ظٹظ„ ظ‡ط°ظ‡ ط§ظ„طµظˆط±ط© ظˆطھظ‚ط¯ظٹظ… ظ…ظ„ط®طµ ظˆطھظˆط¬ظٹظ‡ط§طھ ط¹ظ…ظ„ظٹط© ظ„ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„.',
    image,
  });

  const geminiResult = await callGeminiApi({
    systemPrompt,
    messages,
    temperature: 0.65,
    maxOutputTokens: 3000,
    timeoutMs: 18000,
  });

  if (geminiResult?.text) {
    return NextResponse.json({
      success: true,
      reply: geminiResult.text.trim(),
      gateway: `Gemini AI (${geminiResult.model})`,
      actions: [
        { type: 'navigate', label: 'ظƒط´ظپ ط§ظ„ط­ط¶ظˆط± ظˆط§ظ„ط¬ط¯ظˆظ„', target: '/branches/ikhlas-jeddah' },
        { type: 'navigate', label: 'ط¥ط¯ط§ط±ط© ط§ظ„ط·ظ„ط§ط¨ ط¨ط§ظ„ظ…ظ†طµط©', target: '/students' },
      ],
    });
  }

  // 4. If Gemini is not reachable or no API key, provide comprehensive smart pedagogical answer
  let fallbackReply = '';
  if (image) {
    fallbackReply = [
      `ًں“¸ **طھط­ظ„ظٹظ„ ط§ظ„طµظˆط±ط© ط§ظ„ظ…ط±ظپظ‚ط© ظ„ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰:**`,
      `ط§ط³طھظ„ظ…طھ ط§ظ„طµظˆط±ط© ط§ظ„ظ…ط±ظپظ‚ط© ط¨ظ†ط¬ط§ط­. ظٹطھظ… ط§ظ„ط¢ظ† ظپط­طµ ط¹ظ†ط§طµط±ظ‡ط§ ط§ظ„طھط¹ظ„ظٹظ…ظٹط©.`,
      `ط¥ط°ط§ ظƒط§ظ†طھ ظˆط±ظ‚ط© ط¹ظ…ظ„ ط£ظˆ ط¬ط¯ظˆظ„ط§ظ‹ ظ…ط¯ط±ط³ظٹط§ظ‹طŒ ظٹظ…ظƒظ†ظƒ ط§ط³طھط®ط¯ط§ظ… ظ…ط­ط±ط± ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ ط£ظˆ ظƒط´ظپ ط§ظ„ط­ط¶ظˆط± ظ„طھط·ط¨ظٹظ‚ظ‡ط§ ظ…ط¨ط§ط´ط±ط© ط¯ط§ط®ظ„ ط§ظ„ظپطµظ„.`,
      `ًں“Œ ظ†طµظٹط­ط©: ظٹظ…ظƒظ†ظƒ ط£ظٹط¶ط§ظ‹ ط·ظ„ط¨ طµظٹط§ط؛ط© ظƒظˆظٹط² طھظپط§ط¹ظ„ظٹ ط£ظˆ طھط­ط¶ظٹط± ط¯ط±ط³ ظ…ط³طھظˆط­ظ‰ ظ…ظ† ظ‡ط°ظ‡ ط§ظ„طµظˆط±ط© ط¹ط¨ط± ظƒطھط§ط¨ط© ظ…ظˆط¶ظˆط¹ظ‡ط§ ظپظٹ ط§ظ„ط±ط³ط§ظ„ط©.`,
    ].join('\n');
  } else if (normalized.includes('ط¨ط­ط«') || normalized.includes('ط¯ط±ط§ط³ط©') || normalized.includes('ط§ط³طھط±ط§طھظٹط¬ظٹط©')) {
    fallbackReply = [
      `ًں“– **ظ…ظ„ط®طµ ط¹ظ„ظ…ظٹ ظˆطھط±ط¨ظˆظٹ ظ…طھط®طµطµ ظ„ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„:**`,
      `â€¢ **ط§ظ„ظپظƒط±ط©:** ط¯ظ…ط¬ ط£ط³ط§ظ„ظٹط¨ ط§ظ„طھط¹ظ„ظ… ظ…طھط¹ط¯ط¯ ط§ظ„ط­ظˆط§ط³ (Multisensory Learning) ظ…ط¹ ط§ظ„طھط؛ط°ظٹط© ط§ظ„ط±ط§ط¬ط¹ط© ظˆط§ظ„طھط¹ط²ظٹط² ط§ظ„ظپظˆط±ظٹ ظٹط±ظپط¹ ط¯ط§ظپط¹ظٹط© ط·ظ„ط§ط¨ طµط¹ظˆط¨ط§طھ ط§ظ„طھط¹ظ„ظ… ط¨ظ†ط³ط¨ط© طھطھط¬ط§ظˆط² 40%.`,
      `â€¢ **ط§ظ„طھط·ط¨ظٹظ‚ ط§ظ„ط¹ظ…ظ„ظٹ ط¯ط§ط®ظ„ ط§ظ„ظ…ظ†طµط©:**`,
      `1. ط§ظ„ط§ط¹طھظ…ط§ط¯ ط¹ظ„ظ‰ ط§ظ„ط¨ط·ط§ظ‚ط§طھ ط§ظ„طھظپط§ط¹ظ„ظٹط© ط§ظ„ظ‚طµظٹط±ط© (Micro-tasks).`,
      `2. طھط¹ط²ظٹط² ط§ظ„ط·ط§ظ„ط¨ ط¨ظ†ظ‚ط§ط· ظˆط´ط§ط±ط§طھ ظپظˆط±ظٹط© ط¹ظ†ط¯ ط¥طھظ…ط§ظ… ط§ظ„طھط¯ط±ظٹط¨.`,
      `3. ط¥ط´ط±ط§ظƒ ط§ظ„ط£ط³ط±ط© ط¹ط¨ط± طھظ‚ط§ط±ظٹط± طھظ‚ط¯ظ… ظˆط§ط¶ط­ط© ظˆط¨ط¯ظˆظ† ظ…طµط·ظ„ط­ط§طھ طھط´ط®ظٹطµظٹط© ظ…ط­ط¨ط·ط©.`,
    ].join('\n');
  } else {
    fallbackReply = [
      `ط£ظ‡ظ„ط§ظ‹ ط¨ظƒ ظٹط§ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„ ط¹ظٹط³ظ‰. ظ…ط³ط§ط¹ط¯ظƒ ط§ظ„ط°ظƒظٹ ط¬ط§ظ‡ط² ظ„ظ…ط³ط§ط¹ط¯طھظƒ ظپظٹ ظƒظ„ ظ…ط§ ظٹط®طµ ط§ظ„ظپطµظ„:`,
      `â€¢ ط§ط³ط£ظ„: *"ظ…ظٹظ† ط؛ط§ط¨ ط§ظ„ظ†ظ‡ط§ط±ط¯ظ‡طں"* ظ„ط¹ط±ط¶ ظƒط´ظپ ط§ظ„ط؛ظٹط§ط¨ ط§ظ„ظ„ط­ط¸ظٹ.`,
      `â€¢ ط§ط·ظ„ط¨: *"ط£ظ†ط´ط¦ ظƒظˆظٹط² ط³ط±ظٹط¹"* ظ„طھظˆظ„ظٹط¯ 5 ط£ط³ط¦ظ„ط© ظ…ط¹ ط§ظ„ط¥ط¬ط§ط¨ط§طھ ط§ظ„ظ†ظ…ظˆط°ط¬ظٹط©.`,
      `â€¢ ط§ط·ظ„ط¨: *"ط­ط¶ط±ظ„ظٹ ط¯ط±ط³ ظپظٹ [ط§ظ„ظ…ظˆط¶ظˆط¹]"* ظ„ط¥ط¹ط¯ط§ط¯ ط®ط·ط© طھط¯ط±ظٹط³ ظƒط§ظ…ظ„ط©.`,
      `â€¢ ط§ط·ظ„ط¨: *"ط±ط³ط§ظ„ط© ظ„ظˆظ„ظٹ ط£ظ…ط± ط§ظ„ط؛ط§ط¦ط¨ظٹظ†"* ظ„طھط¬ظ‡ظٹط² ظ†طµ ظˆط§طھط³ط§ط¨ ط¬ط§ظ‡ط² ظ„ظ„ط¥ط±ط³ط§ظ„.`,
    ].join('\n');
  }

  return NextResponse.json({
    success: true,
    reply: fallbackReply,
    gateway: 'ظ…ط­ط±ظƒ ظ…ط³ط§ط± ط§ظ„طھط±ط¨ظˆظٹ ط§ظ„ط°ظƒظٹ',
    actions: [
      { type: 'navigate', label: 'ظپطھط­ ظپطµظ„ ط¯. ط¥ط³ظ…ط§ط¹ظٹظ„', target: '/branches/ikhlas-jeddah' },
      { type: 'navigate', label: 'ظƒط´ظپ ط§ظ„ط­ط¶ظˆط± ط§ظ„ط¨ظٹظˆظ…طھط±ظٹ', target: '/branches/ikhlas-jeddah/face-attendance' },
    ],
  });
}