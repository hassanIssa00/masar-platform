import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { invalidateSnapshotCache } from '@/app/api/data/snapshot/route';

const HW_COLLECTIONS = [
  'homework',
  'curriculum_assignments',
  'student_homework_logs',
  'curriculum_drawings',
  'daily_homework_archive',
];

async function handlePurge(req: NextRequest) {
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

  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  for (const col of HW_COLLECTIONS) {
    try {
      const snap = await db.collection(col).limit(500).get();
      let count = 0;
      for (const doc of snap.docs) {
        await doc.ref.delete();
        count++;
      }
      deleted[col] = count;
    } catch (e: any) {
      errors.push(`${col}: ${e.message}`);
    }
  }

  invalidateSnapshotCache();

  return NextResponse.json({
    ok: true,
    message: 'تم تفريغ كافة الواجبات والرسومات القديمة بنجاح',
    deleted,
    errors,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return handlePurge(req);
}

export async function POST(req: NextRequest) {
  return handlePurge(req);
}
