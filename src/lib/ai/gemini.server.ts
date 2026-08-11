import 'server-only';

// ── Model priority ─────────────────────────────────────────────────────────────
export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'model' | 'system';
  content: string;
  image?: { mimeType: string; data: string };
}

export interface CallGeminiOptions {
  systemPrompt?: string;
  messages: GeminiMessage[];
  temperature?: number;
  customKey?: string;
}

/**
 * Server-only Gemini API Engine with Vision / Multimodal image support.
 */
export async function callGeminiApi({
  systemPrompt = '',
  messages = [],
  temperature = 0.72,
  customKey,
}: CallGeminiOptions): Promise<{ text: string; keyIndex: number; model: string } | null> {
  // ── Build key pool ──────────────────────────────────────────────────────────
  const activeKeys: string[] = [];

  if (customKey?.trim()) {
    activeKeys.push(customKey.trim());
  }

  const envRaw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  if (envRaw) {
    const parsed = envRaw.split(',').map(k => k.trim()).filter(k => k.startsWith('AIza'));
    activeKeys.push(...parsed.filter(k => !activeKeys.includes(k)));
  }

  if (activeKeys.length === 0) {
    console.error('[Gemini] No valid API keys found. Set GEMINI_API_KEY in Vercel env vars.');
    return null;
  }

  // ── Round-robin across keys × models ────────────────────────────────────────
  const startKey = Math.floor(Math.random() * activeKeys.length);

  for (let ki = 0; ki < activeKeys.length; ki++) {
    const keyIndex = (startKey + ki) % activeKeys.length;
    const apiKey = activeKeys[keyIndex];

    for (const model of GEMINI_MODELS) {
      try {
        const contents: Array<{ role: string; parts: Array<any> }> = [];

        if (systemPrompt.trim()) {
          contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
          contents.push({ role: 'model', parts: [{ text: 'حاضر.' }] });
        }

        for (const msg of messages) {
          const parts: Array<any> = [];
          if (msg.content) {
            parts.push({ text: msg.content });
          }
          if (msg.image && msg.image.data) {
            parts.push({
              inlineData: {
                mimeType: msg.image.mimeType || 'image/png',
                data: msg.image.data,
              },
            });
          }
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts,
          });
        }

        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { temperature, maxOutputTokens: 2048 },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(tid);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            console.log(`[Gemini] ✓ ${model} key#${keyIndex}`);
            return { text, keyIndex, model };
          }
        } else {
          const err = await res.json().catch(() => ({}));
          console.warn(`[Gemini] ✗ ${model} key#${keyIndex} → HTTP ${res.status}:`, err?.error?.message);
          // If key is invalid/expired, skip remaining models for this key
          if (res.status === 400 || res.status === 403) break;
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          console.warn(`[Gemini] ✗ ${model} key#${keyIndex} → Timeout`);
        } else {
          console.warn(`[Gemini] ✗ ${model} key#${keyIndex} → ${e?.message}`);
        }
      }
    }
  }

  console.error('[Gemini] All keys and models exhausted — no response.');
  return null;
}
