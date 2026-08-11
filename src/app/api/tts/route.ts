import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/authorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const DEFAULT_MODEL = 'eleven_multilingual_v2';

export async function POST(request: NextRequest) {
  // ── 1. Server-side Authentication ─────────────────────────────────────────
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // ── 1b. Server-side Rate Limiting (10 req / min per user; 30 req / min per IP) ──
  const rateLimit = await checkRateLimit(
    'tts',
    getClientIdentifier(request, user.id),
    { windowMs: 60 * 1000, maxRequests: 10 },
    { identifier: getIpIdentifier(request), maxRequests: 30 },
  );

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetMs || 60000) / 1000).toString();
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': retryAfter } }
    );
  }

  // ── 2. Secrets Check ──────────────────────────────────────────────────────
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return NextResponse.json(
      { error: 'Text-to-speech service is not configured.' },
      { status: 503 },
    );
  }

  // ── 3. Input Validation & Parameter Clamping ──────────────────────────────
  let body: { text?: string; stability?: number; similarityBoost?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  // Maximum character limit guard
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Text exceeds maximum limit of 2000 characters' }, { status: 400 });
  }

  // Clamp numeric parameters between 0.0 and 1.0 to prevent unexpected API behavior
  const rawStability = Number(body.stability);
  const stability = !isNaN(rawStability) ? Math.max(0.0, Math.min(1.0, rawStability)) : 0.58;

  const rawSimilarity = Number(body.similarityBoost);
  const similarityBoost = !isNaN(rawSimilarity) ? Math.max(0.0, Math.min(1.0, rawSimilarity)) : 0.78;

  // ── 4. ElevenLabs API Request ──────────────────────────────────────────────
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID ?? DEFAULT_MODEL,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS API Error] ElevenLabs returned error:', response.status, errorText);
      return NextResponse.json({ error: 'Text-to-speech synthesis failed' }, { status: 502 });
    }

    const audio = await response.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[TTS API Exception]:', err.message);
    return NextResponse.json({ error: 'Internal synthesis error' }, { status: 500 });
  }
}
