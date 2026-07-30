import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_MODEL = 'eleven_multilingual_v2';

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    return NextResponse.json(
      { error: 'ElevenLabs is not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.' },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { text?: string; stability?: number; similarityBoost?: number };
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

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
        stability: body.stability ?? 0.58,
        similarity_boost: body.similarityBoost ?? 0.78,
        style: 0.18,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json({ error: 'ElevenLabs request failed', details }, { status: response.status });
  }

  const audio = await response.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
