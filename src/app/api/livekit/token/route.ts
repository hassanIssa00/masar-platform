import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/authorization';
import { authorizeRoomAccess } from '@/lib/auth/roomAuthorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  // ── 1. Server-side Authentication ────────────────────────────────────────
  let user = await requireAuth(req);
  let isGuest = false;
  if (!user) {
    const rawRoom = req.nextUrl.searchParams.get('room') || '';
    const normRoom = rawRoom.toLowerCase().trim();
    if (
      normRoom === 'ikhlas-jeddah' ||
      normRoom === 'ikhlas_jeddah' ||
      normRoom.startsWith('live-') ||
      normRoom.startsWith('ikhlas-')
    ) {
      const guestName = req.nextUrl.searchParams.get('name')?.trim() || 'ولي أمر (مشاهد)';
      user = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: guestName.slice(0, 50),
        role: 'parent' as any,
        email: '',
        schoolBranch: 'IKHLAS_JEDDAH',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        v: 1,
      };
      isGuest = true;
    } else {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // ── 1b. Server-side Rate Limiting (10 req / min per user; 30 req / min per IP) ──
  const rateLimit = await checkRateLimit(
    'livekit_token',
    getClientIdentifier(req, user.id),
    { windowMs: 60 * 1000, maxRequests: 10 },
    { identifier: getIpIdentifier(req), maxRequests: 30 },
  );

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetMs || 60000) / 1000).toString();
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': retryAfter } }
    );
  }

  // ── 2. Input Sanitization ─────────────────────────────────────────────────
  const rawRoom = req.nextUrl.searchParams.get('room') || 'ikhlas-grade-1';
  const room = rawRoom.replace(/[^\w\s-]/gi, '').trim().slice(0, 60);

  if (!room) {
    return NextResponse.json({ error: 'Invalid room parameter' }, { status: 400 });
  }

  // ── 3. Server-Authoritative Room Resolution & Authorization ──────────────
  // Room pattern match alone is NOT enough — resolves user-to-room relationship
  const roomAuth = await authorizeRoomAccess(user, room);

  if (!roomAuth.authorized) {
    return NextResponse.json(
      { error: roomAuth.reason || 'Unauthorized classroom room access' },
      { status: 403 }
    );
  }

  // ── 4. Identity Derivation (Server Session Only) ──────────────────────────
  const userId = user.id || `user_${Date.now()}`;
  const userName = user.name || user.email || 'مستخدم مسار';

  // ── 5. Secret Retrieval ───────────────────────────────────────────────────
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://masarplatform-73wpzvkh.livekit.cloud';

  if (!apiKey || !apiSecret) {
    console.error('[LiveKit API Error] LIVEKIT_API_KEY or LIVEKIT_API_SECRET missing in environment');
    return NextResponse.json({ error: 'LiveKit service temporarily unavailable' }, { status: 503 });
  }

  // ── 6. Token Generation with Minimum Required Grants ──────────────────────
  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
      ttl: '4h',
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: roomAuth.canPublish,
      canPublishData: roomAuth.canPublishData,
      canSubscribe: true,
      roomAdmin: false,
      roomCreate: false,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      wsUrl,
      canPublish: roomAuth.canPublish,
    });
  } catch (error: any) {
    console.error('[LiveKit API Error] Token generation failed:', error.message);
    return NextResponse.json({ error: 'Failed to generate session token' }, { status: 500 });
  }
}
