'use client';

import { getStudents, saveMessage, saveActivity, StudentRecord } from './localDb';
import { getClassStudents } from './classDb';
import { createHomework, HomeworkRecord, saveLocalHomework, getLocalHomework } from './homework';
import { Period, DAY_NAMES } from '@/data/ikhlasSchedule';
import { syncDocToCloud } from './firestoreSync';

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
    return { success: false, count: 0, message: 'لا يوجد طلاب أو أولياء أمور مسجلين حالياً.' };
  }

  let sentCount = 0;
  for (const t of targets) {
    const body = formatScheduleBroadcastMessage(t.name, schedule, customNote);
    saveMessage({
      studentId: t.id,
      from: 'doctor',
      to: 'parent',
      body,
      read: false,
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
    message: `تم إرسال جدول الحصص بنجاح إلى ${sentCount} ولي أمر! ✅`,
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

  const baseHomeworkId = `hw_${Date.now()}`;
  const localItems = getLocalHomework();
  const newHomeworkEntries: HomeworkRecord[] = [];

  let sentCount = 0;

  for (const t of targets) {
    const hwItem: HomeworkRecord = {
      id: `${baseHomeworkId}_${t.id}`,
      studentId: t.id,
      studentName: t.name,
      title: hwData.title,
      description: hwData.description,
      dueDate: hwData.dueDate,
      status: 'assigned',
      createdAt: new Date().toISOString(),
    };

    newHomeworkEntries.push(hwItem);

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
      from: 'doctor',
      to: 'parent',
      body: msgBody,
      read: false,
    });

    sentCount++;
  }

  // Save and sync all homework entries
  saveLocalHomework([...newHomeworkEntries, ...localItems]);
  for (const entry of newHomeworkEntries) {
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
