import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room') || 'ikhlas-grade-1';
  const username = req.nextUrl.searchParams.get('username') || 'ضيف';
  const isHost = req.nextUrl.searchParams.get('isHost') === 'true';

  const apiKey = process.env.LIVEKIT_API_KEY || 'APIVGMBkUJsJg2A';
  const apiSecret = process.env.LIVEKIT_API_SECRET || 'SZhBDZdiC7C8FZv38Mv8qAlLcTNYVFiMZLze5ohdw5V';
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://masarplatform-73wpzvkh.livekit.cloud';

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Server misconfigured: missing LiveKit API credentials' }, { status: 500 });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      name: username,
      ttl: '24h',
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: isHost,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, wsUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate token' }, { status: 500 });
  }
}
