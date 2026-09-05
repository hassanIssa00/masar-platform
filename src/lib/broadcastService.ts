'use client';

import { getStudents, getAccounts, saveMessage, saveActivity, StudentRecord } from './cloudStore';
import { getClassStudents, saveStudentHomeworkLog } from './classDb';
import { createHomework, HomeworkRecord, saveLocalHomework, getLocalHomework } from './homework';
import { Period, DAY_NAMES } from '@/data/ikhlasSchedule';
import { syncDocToCloud } from './firestoreSync';
import { createNotification } from './notifications';

export interface BroadcastResult {
  success: boolean;
  count: number;
  message: string;
}

/**
 * Formats a clean Arabic schedule message for parents.
 */
export function formatScheduleBroadcastMessage(
  studentName: string,
  schedule: Period[],
  customNote?: string
): string {
  const jsDay = new Date().getDay();
  const dayName = jsDay >= 0 && jsDay <= 4 ? DAY_NAMES[jsDay] : 'الأحد';
  const dayIndex = jsDay >= 0 && jsDay <= 4 ? jsDay : 0;

  const todayPeriods = schedule
    .filter((p) => p.dayOfWeek === dayIndex)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  let text = `📅 *جدول الحصص المعتمد — فصل د. إسماعيل عيسى*\n`;
  text += `عزيزي ولي أمر الطالب: *${studentName}* 👋\n\n`;
  text += `📋 *حصص اليوم (${dayName}):*\n`;

  if (todayPeriods.length > 0) {
    todayPeriods.forEach((p) => {
      text += `• الحصة ${p.periodNumber}: *${p.subjectName}* (${p.startTime} - ${p.endTime})\n`;
    });
  } else {
    text += `• اليوم إجازة رسمية أو لا توجد حصص مسجلة.\n`;
  }

  if (customNote) {
    text += `\n💡 *ملاحظة د. إسماعيل:*\n${customNote}\n`;
  }

  text += `\n🌟 نسعد دائماً بمتابعتكم ودعمكم لأبطالنا الصغار!`;
  return text;
}

export const formatScheduleBroadcastMessageForParents = formatScheduleBroadcastMessage;

/**
 * Formats a motivational Arabic schedule message tailored for students.
 */
export function formatScheduleBroadcastMessageForStudents(
  studentName: string,
  schedule: Period[],
  customNote?: string
): string {
  const jsDay = new Date().getDay();
  const dayName = jsDay >= 0 && jsDay <= 4 ? DAY_NAMES[jsDay] : 'الأحد';
  const dayIndex = jsDay >= 0 && jsDay <= 4 ? jsDay : 0;

  const todayPeriods = schedule
    .filter((p) => p.dayOfWeek === dayIndex)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  let text = `📅 *جدول حصصك الأسبوعي المعتمد — فصل د. إسماعيل عيسى*\n`;
  text += `مرحباً يا بطل: *${studentName}* 🌟🎒\n\n`;
  text += `📋 *جدول حصصك اليوم (${dayName}):*\n`;

  if (todayPeriods.length > 0) {
    todayPeriods.forEach((p) => {
      text += `• الحصة ${p.periodNumber}: *${p.subjectName}* (${p.startTime} - ${p.endTime})\n`;
    });
  } else {
    text += `• اليوم إجازة رسمية، استمتع بوقتك واستعد للأيام القادمة بنشاط! ✨\n`;
  }

  if (customNote) {
    text += `\n💡 *رسالة د. إسماعيل لك:*\n${customNote}\n`;
  }

  text += `\n🚀 نتمنى لك يوماً دراسياً ممتعاً ومليئاً بالإبداع والتفوق!`;
  return text;
}

/**
 * Broadcasts the current class schedule to all registered parents in one click.
 */
export async function broadcastScheduleToParents(
  schedule: Period[],
  customNote?: string
): Promise<BroadcastResult> {
  const allMainStudents = getStudents();
  const classStudents = getClassStudents();

  // Combine unique students across main db and class db
  const targetMap = new Map<string, { id: string; name: string; phone?: string; parentName?: string }>();

  classStudents.forEach((s) => {
    targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName });
  });

  allMainStudents.forEach((s) => {
    if (!targetMap.has(s.id)) {
      targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName });
    }
  });

  const targets = Array.from(targetMap.values());
  if (targets.length === 0) {
    return { success: false, count: 0, message: 'لا يوجد أولياء أمور مسجلين حالياً.' };
  }

  let sentCount = 0;
  for (const t of targets) {
    const body = formatScheduleBroadcastMessageForParents(t.name, schedule, customNote);
    saveMessage({
      studentId: t.id,
      from: 'doctor',
      to: 'parent',
      body,
      read: false,
    });

    void createNotification({
      type: 'system',
      title: `📅 جدول الحصص للبطل ${t.name}`,
      body: `تم إرسال جدول الحصص المعتمد من قِبَل د. إسماعيل عيسى، تفقده الآن!`,
      link: `/school-parent`,
      targetRole: 'parent',
      studentId: t.id,
      studentName: t.name,
    });

    sentCount++;
  }

  saveActivity({
    type: 'student',
    title: '📤 إرسال جدول الحصص لجميع أولياء الأمور',
    detail: `تم إرسال جدول الحصص المعتمد إلى ${sentCount} ولي أمر بنجاح بضغطة واحدة.`,
  });

  return {
    success: true,
    count: sentCount,
    message: `تم إرسال جدول الحصص بنجاح إلى جميع أولياء الأمور (${sentCount} ولي أمر)! ✅`,
  };
}

/**
 * Broadcasts the current class schedule to all registered students in one click.
 */
export async function broadcastScheduleToStudents(
  schedule: Period[],
  customNote?: string
): Promise<BroadcastResult> {
  const allMainStudents = getStudents();
  const classStudents = getClassStudents();

  // Combine unique students across main db and class db
  const targetMap = new Map<string, { id: string; name: string; phone?: string; parentName?: string }>();

  classStudents.forEach((s) => {
    targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName });
  });

  allMainStudents.forEach((s) => {
    if (!targetMap.has(s.id)) {
      targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName });
    }
  });

  const targets = Array.from(targetMap.values());
  if (targets.length === 0) {
    return { success: false, count: 0, message: 'لا يوجد طلاب مسجلين حالياً.' };
  }

  let sentCount = 0;
  for (const t of targets) {
    const body = formatScheduleBroadcastMessageForStudents(t.name, schedule, customNote);
    saveMessage({
      studentId: t.id,
      from: 'doctor',
      to: 'parent',
      body,
      read: false,
    });

    const notifId = `sched_stud_${t.id}_${Date.now()}`;
    void syncDocToCloud('notifications', notifId, {
      id: notifId,
      studentId: t.id,
      studentName: t.name,
      title: '📅 جدول الحصص الأسبوعي المحدث',
      body: `تم إرسال جدول الحصص المحدث من قِبَل د. إسماعيل عيسى، تفقده الآن في خطتك الدراسية!`,
      type: 'system',
      link: '/school-student?tab=schedule',
      read: false,
      createdAt: new Date().toISOString(),
      targetRole: 'student',
    });

    sentCount++;
  }

  saveActivity({
    type: 'student',
    title: '🎒 إرسال جدول الحصص لجميع الطلاب',
    detail: `تم إرسال جدول الحصص المعتمد إلى ${sentCount} طالب بنجاح مع التنبيه في البوابة.`,
  });

  return {
    success: true,
    count: sentCount,
    message: `تم إرسال جدول الحصص بنجاح إلى جميع الطلاب (${sentCount} طالب)! 🎒✅`,
  };
}

/**
 * Broadcasts a homework assignment to all registered parents and students in one click.
 */
export async function broadcastHomeworkToParents(hwData: {
  title: string;
  description: string;
  subject?: string;
  dueDate: string;
  notes?: string;
  images?: string[];
  fromPage?: number;
  toPage?: number;
  subjectSlug?: string;
}): Promise<BroadcastResult> {
  const allMainStudents = getStudents();
  const classStudents = getClassStudents();

  const targetMap = new Map<string, { id: string; name: string; phone?: string; parentName?: string }>();

  classStudents.forEach((s) => {
    targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName });
  });

  allMainStudents.forEach((s) => {
    if (!targetMap.has(s.id)) {
      targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName });
    }
  });

  const targets = Array.from(targetMap.values());
  if (targets.length === 0) {
    return { success: false, count: 0, message: 'لا يوجد طلاب مسجلين لإرسال الواجب إليهم.' };
  }

  const allAccounts = typeof window !== 'undefined' ? getAccounts() : [];
  const localItems = getLocalHomework();
  const newHomeworkEntries: (HomeworkRecord & { fromPage?: number; toPage?: number; subjectSlug?: string; subjectTitle?: string })[] = [];

  let sentCount = 0;

  for (const t of targets) {
    // Resolve Student & Parent Accounts
    const sAcc = allAccounts.find((a) => a.role === 'student' && (a.id === t.id || a.linkedStudentId === t.id || (t.name && a.name && a.name.trim() === t.name.trim())));
    const pAcc = allAccounts.find((a) => a.role === 'parent' && ((t.phone && a.phone && a.phone.slice(-8) === t.phone.slice(-8)) || (t.parentName && a.name && a.name.trim() === t.parentName.trim())));

    const studentAccountId = sAcc?.id;
    const parentAccountId = pAcc?.id;
    const parentPhone = t.phone || pAcc?.phone || '';
    const parentName = t.parentName || pAcc?.name || 'ولي الأمر';

    const universalHwId = `hw_${hwData.subjectSlug || 'curriculum'}_${t.id}_p${hwData.fromPage || 1}_${hwData.toPage || 1}`;

    const hwItem: HomeworkRecord & { fromPage?: number; toPage?: number; subjectSlug?: string; subjectTitle?: string } = {
      id: universalHwId,
      studentId: t.id,
      studentName: t.name,
      studentAccountId,
      parentAccountId,
      parentPhone,
      parentName,
      title: hwData.title,
      description: hwData.description,
      dueDate: hwData.dueDate,
      status: 'assigned',
      type: 'CURRICULUM',
      fromPage: hwData.fromPage,
      toPage: hwData.toPage,
      subjectSlug: hwData.subjectSlug,
      subjectTitle: hwData.subject,
      createdAt: new Date().toISOString(),
    };

    newHomeworkEntries.push(hwItem);

    // Save to student homework log
    saveStudentHomeworkLog({
      id: universalHwId,
      studentId: t.id,
      studentName: t.name,
      studentAccountId,
      parentAccountId,
      parentPhone,
      parentName,
      title: hwData.title,
      subject: hwData.subject || 'المنهج المدرسي',
      subjectSlug: hwData.subjectSlug,
      fromPage: hwData.fromPage,
      toPage: hwData.toPage,
      dueDate: hwData.dueDate,
      status: 'assigned',
      teacherFeedback: 'واجب مكلف من د. إسماعيل عيسى - حل التدريبات بالكتاب التفاعلي',
    });

    // Format chat message
    let msgBody = `📝 *واجب منزلي جديد — مادة ${hwData.subject || 'المادة'}*\n`;
    msgBody += `عزيزي ولي أمر الطالب: *${t.name}* 👋\n\n`;
    msgBody += `📌 *عنوان الواجب:* ${hwData.title}\n`;
    msgBody += `📖 *المطلوب:*\n${hwData.description}\n\n`;
    msgBody += `⏰ *موعد التسليم المعتمد:* ${hwData.dueDate}\n`;
    if (hwData.notes) {
      msgBody += `💡 *ملاحظة:* ${hwData.notes}\n`;
    }
    msgBody += `\nيرجى مراجعة الواجب مع الطفل وتسليمه عبر بوابة الواجبات في المنصة.`;

    saveMessage({
      studentId: t.id,
      studentName: t.name,
      studentAccountId,
      parentAccountId,
      parentPhone,
      parentName,
      from: 'doctor',
      to: 'parent',
      body: msgBody,
      read: false,
    } as any);

    // In-app notification for Parent
    void createNotification({
      type: 'homework',
      title: `📝 واجب جديد للبطل ${t.name}: ${hwData.title}`,
      body: `تم إسناد واجب جديد (${hwData.title}) من قبل د. إسماعيل عيسى. موعد التسليم: ${hwData.dueDate}. يمكنك الاطلاع على التفاصيل من لوحة ولي الأمر.`,
      link: `/school-parent?student=${t.id}&tab=homework`,
      targetRole: 'parent',
      studentId: t.id,
      studentName: t.name,
    });

    // In-app notification for Student
    void createNotification({
      type: 'homework',
      title: `📝 واجب تفاعلي جديد: ${hwData.title}`,
      body: `كلفك د. إسماعيل عيسى بحل التدريبات من ص (${hwData.fromPage || 1}) إلى ص (${hwData.toPage || 1}) بالكتاب التفاعلي.`,
      link: `/school-student?tab=homework`,
      targetRole: 'student',
      studentId: t.id,
      studentName: t.name,
    });

    sentCount++;
  }

  // Also create a broadcast entry for 'all'
  const broadcastAllEntry: HomeworkRecord & { fromPage?: number; toPage?: number; subjectSlug?: string; subjectTitle?: string } = {
    id: `hw_${hwData.subjectSlug || 'curriculum'}_all_p${hwData.fromPage || 1}_${hwData.toPage || 1}`,
    studentId: 'all',
    studentName: 'جميع طلاب الفصل',
    title: hwData.title,
    description: hwData.description,
    dueDate: hwData.dueDate,
    status: 'assigned',
    type: 'CURRICULUM',
    fromPage: hwData.fromPage,
    toPage: hwData.toPage,
    subjectSlug: hwData.subjectSlug,
    subjectTitle: hwData.subject,
    createdAt: new Date().toISOString(),
  };

  // Save and sync all homework entries
  const existingIds = new Set(newHomeworkEntries.map((e) => e.id));
  existingIds.add(broadcastAllEntry.id);
  const filteredLocal = localItems.filter((item) => !existingIds.has(item.id));
  const mergedAll = [broadcastAllEntry, ...newHomeworkEntries, ...filteredLocal];

  saveLocalHomework(mergedAll);
  for (const entry of [broadcastAllEntry, ...newHomeworkEntries]) {
    void syncDocToCloud('homework', entry.id, entry);
  }

  saveActivity({
    type: 'student',
    title: `📝 تكليف واجب جديد: ${hwData.title}`,
    detail: `تم إرسال وتكليف الواجب إلى ${sentCount} طالب مع إشعار فوري لأولياء الأمور.`,
  });

  return {
    success: true,
    count: sentCount,
    message: `تم إرسال الواجب بنجاح إلى جميع أولياء الأمور (${sentCount} طالب) مع تنبيههم في الشات! ✅`,
  };
}

/**
 * Broadcasts an assessment / test assignment to all registered students and notifies their parents in chat.
 */
export async function broadcastAssessmentToStudentsAndParents(data: {
  testTitle: string;
  grade?: string;
  branch?: 'MASAR' | 'IKHLAS_JEDDAH' | 'ALL';
  instructions?: string;
  dueDate?: string;
  testLink?: string;
}): Promise<BroadcastResult> {
  const allMainStudents = getStudents();
  const classStudents = getClassStudents();

  const targetMap = new Map<string, { id: string; name: string; phone?: string; parentName?: string; schoolBranch?: string }>();

  classStudents.forEach((s) => {
    targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName, schoolBranch: (s as any).schoolBranch || 'IKHLAS_JEDDAH' });
  });

  allMainStudents.forEach((s) => {
    if (!targetMap.has(s.id)) {
      targetMap.set(s.id, { id: s.id, name: s.fullName, phone: s.parentPhone, parentName: s.parentName, schoolBranch: (s as any).schoolBranch || 'MASAR' });
    }
  });

  let targets = Array.from(targetMap.values());
  if (data.branch && data.branch !== 'ALL') {
    targets = targets.filter((t) => t.schoolBranch === data.branch || (data.branch === 'IKHLAS_JEDDAH' && t.schoolBranch !== 'MASAR'));
  }

  if (targets.length === 0) {
    return { success: false, count: 0, message: 'لا يوجد طلاب مسجلون في هذا المسار لإرسال الاختبار إليهم.' };
  }

  const baseAssessmentId = `test_assign_${Date.now()}`;
  let sentCount = 0;

  for (const t of targets) {
    const msgBody = `🎯 *تكليف اختبار جديد — ${data.testTitle}*\n` +
      `عزيزي ولي أمر الطالب: *${t.name}* 👋\n\n` +
      `📌 *عنوان الاختبار:* ${data.testTitle}\n` +
      (data.grade ? `🎓 *المستوى / الصف:* ${data.grade}\n` : '') +
      (data.instructions ? `📖 *تعليمات د. إسماعيل:*\n${data.instructions}\n\n` : '') +
      (data.dueDate ? `⏰ *تاريخ الإنجاز المطلوب:* ${data.dueDate}\n` : '') +
      `\nيرجى مساعدة البطل في فتح الاختبار عبر حسابه في المنصة والإجابة بدقة لتقييم مستواه ومتابعة خطته التعليمية.`;

    saveMessage({
      studentId: t.id,
      from: 'doctor',
      to: 'parent',
      body: msgBody,
      read: false,
    });

    // Also sync test notification to cloud for student
    const notificationDoc = {
      id: `${baseAssessmentId}_${t.id}`,
      studentId: t.id,
      studentName: t.name,
      title: `اختبار جديد: ${data.testTitle}`,
      body: data.instructions || `تم تكليفك باختبار جديد من د. إسماعيل عيسى: ${data.testTitle}`,
      type: 'assessment',
      link: data.testLink || `/assessment?student=${t.id}&flow=student`,
      read: false,
      createdAt: new Date().toISOString(),
      targetRole: 'student',
    };
    void syncDocToCloud('notifications', notificationDoc.id, notificationDoc);

    // In-app notification for Parent
    void createNotification({
      type: 'assessment',
      title: `🎯 اختبار جديد للبطل ${t.name}: ${data.testTitle}`,
      body: data.instructions || `تم تكليف البطل باختبار (${data.testTitle}) من قِبَل د. إسماعيل عيسى.`,
      link: `/school-parent`,
      targetRole: 'parent',
      studentId: t.id,
      studentName: t.name,
    });

    sentCount++;
  }

  saveActivity({
    type: 'student',
    title: `🎯 إرسال اختبار جديد لجميع الطلاب: ${data.testTitle}`,
    detail: `تم إرسال تكليف الاختبار وإشعار أولياء الأمور لـ ${sentCount} طالب بنجاح.`,
  });

  return {
    success: true,
    count: sentCount,
    message: `تم إرسال تكليف الاختبار وإشعار أولياء الأمور (${sentCount} طالب) بنجاح! ✅`,
  };
}

