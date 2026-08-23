import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session.server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const account = token ? await verifySessionToken(token) : null;

  if (!account) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      schoolBranch: account.schoolBranch,
      phone: account.phone,
    },
  });
}
