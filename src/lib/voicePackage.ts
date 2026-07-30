'use client';

type VoiceOptions = {
  rate?: number;
  lang?: string;
};

const audioCache = new Map<string, string>();

function fallbackSpeak(text: string, options: VoiceOptions = {}) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang ?? 'ar-SA';
  utterance.rate = options.rate ?? 0.82;
  utterance.pitch = 1.08;
  window.speechSynthesis.speak(utterance);
}

export async function speakWithMasarVoice(text: string, options: VoiceOptions = {}) {
  if (typeof window === 'undefined') return;

  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return;

  try {
    const cached = audioCache.get(cleanText);
    if (cached) {
      const audio = new Audio(cached);
      await audio.play();
      return;
    }

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText }),
    });

    if (!response.ok) {
      fallbackSpeak(cleanText, options);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(cleanText, url);
    const audio = new Audio(url);
    await audio.play();
  } catch {
    fallbackSpeak(cleanText, options);
  }
}
