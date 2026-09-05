import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { invalidateSnapshotCache } from '@/app/api/data/snapshot/route';

async function handlePurgeInvalidBadges(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret') || req.headers.get('x-cleanup-secret') || '';
  const validSecret = process.env.CLEANUP_SECRET || 'masar-cleanup-2026-ikhlas';

  if (secret !== validSecret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin not configured' }, { status: 500 });
  }

  let deletedBadges = 0;
  let deletedCerts = 0;
  const errors: string[] = [];

  // 1. Purge invalid badges
  try {
    const snap = await db.collection('studentBadges').get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.studentId || data.studentId === 'all' || data.studentName === 'جميع طلاب الفصل' || data.studentId === 'student_assessment') {
        await doc.ref.delete();
        deletedBadges++;
      }
    }
  } catch (e: any) {
    errors.push(`studentBadges: ${e.message}`);
  }

  // 2. Purge invalid certificates
  try {
    const certSnap = await db.collection('student_cert_logs').get();
    for (const doc of certSnap.docs) {
      const data = doc.data();
      if (!data.studentId || data.studentId === 'all' || data.studentName === 'جميع طلاب الفصل') {
        await doc.ref.delete();
        deletedCerts++;
      }
    }
  } catch (e: any) {
    errors.push(`student_cert_logs: ${e.message}`);
  }

  invalidateSnapshotCache();

  return NextResponse.json({
    ok: true,
    message: 'تم حذف كافة الأوسمة والشهادات العامة المشتركة بنجاح',
    deletedBadges,
    deletedCerts,
    errors,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return handlePurgeInvalidBadges(req);
}

export async function POST(req: NextRequest) {
  return handlePurgeInvalidBadges(req);
}
