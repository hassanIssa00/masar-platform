/**
 * 🤖 Gemini API Service Engine for Masar Platform
 * 
 * Features:
 * - Load-balanced rotation across 12+ Gemini API keys.
 * - Automatic model failover across (gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro).
 * - Per-request timeouts and error catching.
 */

const RAW_KEYS_B64 = [
  'QVEuQWI4Uk42S245RHhnQzZGaTdxVlc1STVHUHdaWWRVTzdvcThHbUhGeDBYVlJsN1R2Nnc=',
  'QVEuQWI4Uk42SmdpZFhJLUlaaDI2WTVJdFYtNDFkX29CNkdVbV9JbENMQW85b19PY2NaRFE=',
  'QVEuQWI4Uk42TERkTGlhb05BclZVUDEwU3VCaTF2MjVqUDhCZ1dNejlwTXBDc0dqNUV1ZU9n',
  'QVEuQWI4Uk42TDR0LWdQalZvMEIyaFZQbWU2a0JfczFtS2h3dXdJZG5KWTY5WGloR2JtNWc=',
  'QVEuQWI4Uk42SXp4YUNCVExfcHFKS2Q3eTBNR2YtY2Z0endOR1luTmQzNFJYMERBSVFTbmc=',
  'QVEuQWI4Uk42TGRXMlVxZExIMmpsQnVkZHVkdnVIME1kUXlvNTJOZUlCQVFWUUEzUHBZQlE=',
  'QVEuQWI4Uk42SXZGUFIzTldPZnFYQk9SRWpIV0lZMWVqNlVOMlpiakFsX0hpZk9wRER0dFE=',
  'QVEuQWI4Uk42S0p4V1NGanNOUGpwTW9Ka3VETm1wUS1ibVB0dXNidzNOM1NvSVdrYWRJSEE=',
  'QVEuQWI4Uk42TDh6dURoUjBaa3kyWkZZcEgwdzdSaXB2OWZ0c1dlM1pGVnZ1WVcwa09LVmc=',
  'QVEuQWI4Uk42SjRMci1tSUVQTUgxS2NJQlhzNEVONEJVamZGbUdvZWE4VUhzeURNUHFCQT0=',
  'QVEuQWI4Uk42SzlZT296MXctc0gzRGszcWpnY3R0ZFlWc1NSNVJXOUdNcXdfVlR1eTZn',
  'QVEuQWI4Uk42S1I4OVZsem9EcERXMXRWZlk0QmY3b3ZHbGFRdUJOc3FwQ0cxcFA4QnVKc3lB',
];

export const GEMINI_API_KEYS: string[] = RAW_KEYS_B64.map((k) =>
  typeof atob !== 'undefined' ? atob(k) : Buffer.from(k, 'base64').toString('utf-8')
);

export const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

export interface GeminiMessage {
  role: 'user' | 'assistant' | 'model' | 'system';
  content: string;
}

export interface CallGeminiOptions {
  systemPrompt?: string;
  messages: GeminiMessage[];
  temperature?: number;
  customKey?: string;
}

/**
 * Executes a Gemini API call with key rotation & model fallback.
 */
export async function callGeminiApi({
  systemPrompt = '',
  messages = [],
  temperature = 0.7,
  customKey,
}: CallGeminiOptions): Promise<{ text: string; keyIndex: number; model: string } | null> {

  // Include any user provided key or env key at the front of keys list
  const activeKeys = [...GEMINI_API_KEYS];
  const envKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (envKey && !activeKeys.includes(envKey)) {
    activeKeys.unshift(envKey);
  }
  if (customKey && customKey.trim() && !activeKeys.includes(customKey.trim())) {
    activeKeys.unshift(customKey.trim());
  }

  // Pick random starting index for load distribution
  const startIndex = Math.floor(Math.random() * activeKeys.length);
  const maxKeyAttempts = Math.min(3, activeKeys.length);

  for (let i = 0; i < maxKeyAttempts; i++) {
    const keyIndex = (startIndex + i) % activeKeys.length;
    const apiKey = activeKeys[keyIndex];

    for (const model of GEMINI_MODELS) {
      try {
        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

        // System prompt in Gemini API format
        if (systemPrompt && systemPrompt.trim()) {
          contents.push({
            role: 'user',
            parts: [{ text: systemPrompt }],
          });
          contents.push({
            role: 'model',
            parts: [{ text: 'حاضر، أنا جاهز لمساعدتك بكامل الإمكانيات المطلوبة.' }],
          });
        }

        // Conversation history & current prompt
        for (const msg of messages) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content || '' }],
          });
        }

        const body = {
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: 2048,
          },
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          }
        );

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.toString();
          if (text && text.trim().length > 0) {
            return {
              text: text.trim(),
              keyIndex,
              model,
            };
          }
        } else {
          console.warn(`⚠️ Gemini API Key #${keyIndex} (${model}) status ${response.status}`);
        }
      } catch (e: any) {
        console.warn(`⚠️ Error with Gemini model ${model} (Key #${keyIndex}):`, e?.message || e);
        continue;
      }
    }
  }

  return null;
}
