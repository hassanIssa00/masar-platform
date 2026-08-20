import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

const ALLOWED_COLLECTIONS = new Set([
  'accounts',
  'students',
  'reports',
  'surveys',
  'activities',
  'messages',
  'ikhlasLogs',
  'ikhlasPosts',
  'calendar_sessions',
]);

function cleanDocId(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || id.length > 160 || /[\/\\]/.test(id)) return '';
  return id;
}

function canMutate(role: string, collectionName: string, method: 'write' | 'delete') {
  if (role === 'doctor') return true;
  if (role === 'specialist' || role === 'teacher') {
    return collectionName !== 'account_credentials';
  }
  if (method === 'delete') return false;
  return ['students', 'reports', 'surveys', 'messages', 'activities'].includes(collectionName);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher', 'parent', 'student']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بحفظ بيانات المنصة.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const collectionName = typeof body.collectionName === 'string' ? body.collectionName.trim() : '';
  const docId = cleanDocId(body.docId);
  const data = body.data && typeof body.data === 'object' ? body.data : null;

  if (!ALLOWED_COLLECTIONS.has(collectionName) || !docId || !data) {
    return NextResponse.json({ ok: false, error: 'طلب حفظ غير صالح.' }, { status: 400 });
  }

  if (!canMutate(auth.user.role, collectionName, 'write')) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بتعديل هذا النوع من البيانات.' }, { status: 403 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  await adminDb
    .collection(collectionName)
    .doc(docId)
    .set(
      {
        ...data,
        id: data.id || data.accountId || docId,
        updatedAt: data.updatedAt || new Date().toISOString(),
      },
      { merge: true },
    );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بحذف بيانات المنصة.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const collectionName = typeof body.collectionName === 'string' ? body.collectionName.trim() : '';
  const docId = cleanDocId(body.docId);

  if (!ALLOWED_COLLECTIONS.has(collectionName) || !docId) {
    return NextResponse.json({ ok: false, error: 'طلب حذف غير صالح.' }, { status: 400 });
  }

  if (!canMutate(auth.user.role, collectionName, 'delete')) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بحذف هذا النوع من البيانات.' }, { status: 403 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  await adminDb.collection(collectionName).doc(docId).delete();
  return NextResponse.json({ ok: true });
}
