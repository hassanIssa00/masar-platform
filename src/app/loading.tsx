'use client';

import { useEffect, useState, useRef } from 'react';

const MESSAGES = [
  'جاري تحضير مسار الطالب…',
  'نحلل البيانات التعليمية…',
  'نفتح الأدوات التفاعلية…',
  'نرتب خطة التأهيل…',
  'لحظة صبر، نجهز كل شيء…',
];

export default function Loading() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<{ x: number; y: number; size: number; delay: number; dur: number }[]>([]);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setParticles(
      Array.from({ length: 22 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: i * 0.18,
        dur: 2.8 + Math.random() * 2.4,
      }))
    );
    animRef.current = setInterval(() => {
      setMsgIdx((p) => (p + 1) % MESSAGES.length);
    }, 1600);
    let p = 0;
    const pInterval = setInterval(() => {
      p += Math.random() * 8;
      if (p > 92) p = 92;
      setProgress(p);
    }, 300);
    return () => {
      if (animRef.current) clearInterval(animRef.current);
      clearInterval(pInterval);
    };
  }, []);

  return (
    <div
      dir="rtl"
      className="relative grid min-h-screen place-items-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 40% 30%, #0f2a2a 0%, #0a0f1e 55%, #030712 100%)' }}
    >
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: i % 3 === 0 ? '#2dd4bf' : i % 3 === 1 ? '#60a5fa' : '#a78bfa',
              opacity: 0.18,
              animation: `floatUp ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 420, height: 420, left: '50%', top: '40%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(20,184,166,0.13) 0%, transparent 70%)', animation: 'pulse-glow 3s ease-in-out infinite alternate' }} />
        <div className="absolute rounded-full" style={{ width: 240, height: 240, left: '30%', top: '20%', background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)', animation: 'pulse-glow 4.2s 1s ease-in-out infinite alternate' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-0 w-full max-w-xs px-4">

        {/* Orbital scanner */}
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          <span className="absolute rounded-full border border-teal-400/20" style={{ inset: 0, animation: 'spin-slow 8s linear infinite' }} />
          <span className="absolute rounded-full" style={{ inset: 10, border: '1.5px dashed rgba(45,212,191,0.3)', animation: 'spin-slow 5s linear infinite reverse' }} />
          <span className="absolute rounded-full" style={{ inset: 22, background: 'conic-gradient(from 0deg, transparent 70%, #2dd4bf 100%)', animation: 'spin-fast 1.4s linear infinite', opacity: 0.7 }} />
          <span className="absolute rounded-full border border-teal-300/25" style={{ inset: 34 }} />
          <span className="absolute rounded-full" style={{ inset: 40, background: 'radial-gradient(circle, rgba(20,184,166,0.35) 0%, transparent 80%)', animation: 'pulse-core 2s ease-in-out infinite' }} />
          <div className="relative rounded-2xl overflow-hidden bg-white" style={{ width: 68, height: 68, boxShadow: '0 0 32px rgba(45,212,191,0.4), 0 4px 24px rgba(0,0,0,0.5)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/masar-logo.png" alt="منصة مسار" className="w-full h-full object-contain p-1" style={{ animation: 'logo-breathe 3s ease-in-out infinite' }} />
          </div>
          <span className="absolute" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 10px #2dd4bf', top: '50%', left: '50%', transformOrigin: '-54px 0px', transform: 'translateY(-50%)', animation: 'orbit 1.4s linear infinite' }} />
          <span className="absolute" style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa', top: '50%', left: '50%', transformOrigin: '-42px 0px', transform: 'translateY(-50%)', animation: 'orbit 2.2s linear infinite reverse' }} />
        </div>

        {/* Brand name */}
        <div className="mt-7 text-center">
          <p className="text-2xl font-black text-white tracking-wide" style={{ textShadow: '0 0 24px rgba(45,212,191,0.5)' }}>
            {'\u0645\u0646\u0635\u0629 '}<span className="text-teal-300">{'\u0645\u064e\u0633\u064e\u0627\u0631'}</span>
          </p>
          <p className="mt-1 text-xs font-bold text-white/50 tracking-widest uppercase">Dr. Ismail Issa · Smart Rehab</p>
        </div>

        {/* EEG wave bar */}
        <div className="mt-6 flex items-center gap-[3px] h-8 overflow-hidden" aria-hidden>
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="rounded-full shrink-0" style={{ width: 3, background: i % 5 === 0 ? '#2dd4bf' : 'rgba(45,212,191,0.35)', animation: `eeg-bar ${0.5 + (i % 4) * 0.15}s ${i * 0.04}s ease-in-out infinite alternate`, height: 6 }} />
          ))}
        </div>

        {/* Cycling message */}
        <div className="mt-5 h-5 overflow-hidden" style={{ minWidth: 220 }}>
          <p key={msgIdx} className="text-center text-sm font-bold text-white/70" style={{ animation: 'fade-slide-in 0.4s ease both' }}>
            {MESSAGES[msgIdx]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-5 w-56 h-1 rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #2dd4bf, #60a5fa)', boxShadow: '0 0 8px rgba(45,212,191,0.6)' }} />
        </div>

        <p className="mt-5 text-[11px] font-bold text-white/25 text-center">
          {'\u062f. \u0625\u0633\u0645\u0627\u0639\u064a\u0644 \u0639\u064a\u0633\u0649 · \u0627\u0644\u062a\u0623\u0647\u064a\u0644 \u0627\u0644\u0630\u0643\u064a \u0648\u0627\u0644\u062a\u0639\u0644\u0645 \u0627\u0644\u062a\u0641\u0627\u0639\u0644\u064a'}
        </p>
      </div>

      <style>{`
        @keyframes floatUp { from { transform:translateY(0) scale(1); opacity:0.12; } to { transform:translateY(-28px) scale(1.3); opacity:0.28; } }
        @keyframes pulse-glow { from { opacity:0.7; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1.08); } }
        @keyframes spin-slow { to { transform:rotate(360deg); } }
        @keyframes spin-fast { to { transform:rotate(360deg); } }
        @keyframes pulse-core { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.18); } }
        @keyframes logo-breathe { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
        @keyframes orbit { to { transform:translateY(-50%) rotate(360deg); } }
        @keyframes eeg-bar { from { height:4px; opacity:0.35; } to { height:28px; opacity:1; } }
        @keyframes fade-slide-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}