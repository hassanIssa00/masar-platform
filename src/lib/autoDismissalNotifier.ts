'use client';

import { createNotification } from './notifications';
import { getSaudiNow } from './saudiTime';
import { getMinutesUntilDismissal, Period } from '@/data/ikhlasSchedule';

const STORAGE_PREFIX = 'masar_auto_dismissal_notif_';

export interface DismissalMilestone {
  mins: number;
  id: 'm15' | 'm5' | 'm0';
  title: (minsLeft: number, timeStr: string) => string;
  body: (minsLeft: number, timeStr: string) => string;
}

export const DISMISSAL_MILESTONES: DismissalMilestone[] = [
  {
    mins: 15,
    id: 'm15',
    title: (mins) => `⏰ اقتراب انصراف الطلاب — متبقي ${mins} دقيقة`,
    body: (mins, time) =>
      `نحيط أولياء الأمور الكرام علماً بأن اليوم الدراسي بمدرسة الإخلاص بجدة سينتهي خلال ${mins} دقيقة (الموعد: ${time}). نرجو التكرم بالاستعداد والتوجه لبوابة المدرسة للاستلام.`,
  },
  {
    mins: 5,
    id: 'm5',
    title: (mins) => `🔔 تنبيه عاجل: متبقي ${mins} دقائق على خروج الطلاب`,
    body: (_, time) =>
      `الطلاب يستعدون الآن للخروج من فصولهم بمدرسة الإخلاص بجدة (الموعد: ${time}). نرجو من أولياء الأمور الكرام التواجد عند بوابة الاستلام.`,
  },
  {
    mins: 0,
    id: 'm0',
    title: () => `🏫 انتهى اليوم الدراسي — انصراف الطلاب الآن`,
    body: () =>
      `تم بحمد الله انتهاء اليوم الدراسي وحصص اليوم بمدرسة الإخلاص بجدة. أبناؤكم بانتظاركم عند بوابة المدرسة. حفظهم الله ورعاهم.`,
  },
];

function getDismissalTimeStr(jsDay: number): string {
  const isEarlyDay = jsDay === 3 || jsDay === 4; // الأربعاء والخميس
  return isEarlyDay ? '11:45 صباحاً' : '12:40 ظهراً';
}

function getTodayDateKey(): string {
  const saudi = getSaudiNow();
  return saudi.dateStr || new Date().toISOString().slice(0, 10);
}

export function getDismissalNotificationsStatusToday(): {
  sent15: boolean;
  sent5: boolean;
  sent0: boolean;
  lastSentMilestone?: number;
  lastSentTime?: string;
} {
  if (typeof window === 'undefined') {
    return { sent15: false, sent5: false, sent0: false };
  }

  const dateKey = getTodayDateKey();
  const sent15 = Boolean(localStorage.getItem(`${STORAGE_PREFIX}${dateKey}_m15`));
  const sent5 = Boolean(localStorage.getItem(`${STORAGE_PREFIX}${dateKey}_m5`));
  const sent0 = Boolean(localStorage.getItem(`${STORAGE_PREFIX}${dateKey}_m0`));

  let lastSentMilestone: number | undefined;
  let lastSentTime: string | undefined;

  if (sent0) {
    lastSentMilestone = 0;
    lastSentTime = localStorage.getItem(`${STORAGE_PREFIX}${dateKey}_m0`) || undefined;
  } else if (sent5) {
    lastSentMilestone = 5;
    lastSentTime = localStorage.getItem(`${STORAGE_PREFIX}${dateKey}_m5`) || undefined;
  } else if (sent15) {
    lastSentMilestone = 15;
    lastSentTime = localStorage.getItem(`${STORAGE_PREFIX}${dateKey}_m15`) || undefined;
  }

  return { sent15, sent5, sent0, lastSentMilestone, lastSentTime };
}

/**
 * يفحص الساعة المدرسية بتوقيت مكة المكرمة ويرسل إشعاراً تلقائياً لأولياء الأمور
 * عند اقتراب موعد الخروج (15 دقيقة، 5 دقائق، ولحظة الانصراف 0 دقيقة)
 * بدون أي تكرار لنفس الإشعار في نفس اليوم.
 */
export async function checkAndAutoDispatchDismissal(schedule: Period[]): Promise<{
  dispatched: boolean;
  milestone?: number;
  message?: string;
}> {
  if (typeof window === 'undefined') return { dispatched: false };

  const saudi = getSaudiNow();
  const jsDay = saudi.dayOfWeek;
  if (jsDay === 5 || jsDay === 6) {
    return { dispatched: false }; // عطلة نهاية الأسبوع
  }

  const minsLeft = getMinutesUntilDismissal(schedule);
  // خارج نافذة الإشعارات
  if (minsLeft > 20 || minsLeft < -30) {
    return { dispatched: false };
  }

  let targetMilestone: DismissalMilestone | null = null;
  if (minsLeft <= 0 && minsLeft >= -30) {
    targetMilestone = DISMISSAL_MILESTONES.find((m) => m.id === 'm0') || null;
  } else if (minsLeft <= 5 && minsLeft > 0) {
    targetMilestone = DISMISSAL_MILESTONES.find((m) => m.id === 'm5') || null;
  } else if (minsLeft <= 15 && minsLeft > 5) {
    targetMilestone = DISMISSAL_MILESTONES.find((m) => m.id === 'm15') || null;
  }

  if (!targetMilestone) return { dispatched: false };

  const dateKey = getTodayDateKey();
  const sentKey = `${STORAGE_PREFIX}${dateKey}_${targetMilestone.id}`;

  if (localStorage.getItem(sentKey)) {
    return { dispatched: false }; // أُرسل بالفعل اليوم
  }

  // تسليم الإشعار التلقائي
  const timeStr = getDismissalTimeStr(jsDay);
  const title = targetMilestone.title(minsLeft > 0 ? minsLeft : 0, timeStr);
  const body = targetMilestone.body(minsLeft > 0 ? minsLeft : 0, timeStr);

  try {
    // تعليم كمرسل فوراً لمنع أي race condition أثناء المزامنة
    localStorage.setItem(sentKey, new Date().toISOString());

    await createNotification({
      type: 'dismissal',
      title,
      body,
      link: '/school-parent',
      targetRole: 'parent',
      studentId: 'all',
    });

    console.log(`[AutoDismissal] Dispatched milestone ${targetMilestone.id} for date ${dateKey}: ${title}`);
    return {
      dispatched: true,
      milestone: targetMilestone.mins,
      message: title,
    };
  } catch (err) {
    console.error('[AutoDismissal] Error creating notification:', err);
    return { dispatched: false };
  }
}

/**
 * إرسال إشعار فوري يدوي لأولياء الأمور بالدقائق المتبقية بضغطة زر من المعلم/الطبيب
 */
export async function sendManualDismissalNotification(minsLeft: number): Promise<{
  success: boolean;
  message: string;
}> {
  const saudi = getSaudiNow();
  const timeStr = getDismissalTimeStr(saudi.dayOfWeek);

  const title = minsLeft > 0
    ? `⏰ تذكير من المعلم: متبقي ${minsLeft} دقيقة على انصراف الطلاب`
    : `🏫 انتهى اليوم الدراسي — انصراف الطلاب الآن`;

  const body = minsLeft > 0
    ? `نحيطكم علماً بأن اليوم الدراسي بمدرسة الإخلاص بجدة شارف على الانتهاء ومتبقي ${minsLeft} دقيقة (الموعد: ${timeStr}). نرجو التكرم بالتوجه لبوابة المدرسة للاستلام.`
    : `تم بحمد الله انتهاء اليوم الدراسي وحصص اليوم بمدرسة الإخلاص بجدة. أبناؤكم جاهزون للاستلام ببوابة المدرسة.`;

  try {
    await createNotification({
      type: 'dismissal',
      title,
      body,
      link: '/school-parent',
      targetRole: 'parent',
      studentId: 'all',
    });

    return {
      success: true,
      message: `تم إرسال الإشعار بنجاح لجميع أولياء الأمور: "${title}"`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `تعذر إرسال الإشعار: ${err?.message || 'خطأ في الاتصال'}`,
    };
  }
}
