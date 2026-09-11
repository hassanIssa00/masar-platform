'use client';

import { useEffect, useState, useRef } from 'react';

const MESSAGES = [
  'جاري تحضير مسار الطالب…',
  'نحلل البيانات التعليمية…',
  'نفتح الأدوات التفاعلية…',
  'نرتب خطة التأهيل…',
  'لحظة صبر، نجهز كل شيء…',
];

// Particle config
const PARTICLE_COUNT = 28;

interface Particle {
  x: number;
  y: number;
  size: number;
  delay: number;
  dur: number;
  color: string;
  opacity: number;
}

interface RingParticle {
  angle: number;
  radius: number;
  size: number;
  speed: number;
  color: string;
}

export default function Loading() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bgPhase, setBgPhase] = useState(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Typewriter effect
  const typeMessage = (msg: string) => {
    setDisplayedText('');
    let i = 0;
    if (typeRef.current) clearInterval(typeRef.current);
    typeRef.current = setInterval(() => {
      i++;
      setDisplayedText(msg.slice(0, i));
      if (i >= msg.length) {
        if (typeRef.current) clearInterval(typeRef.current);
      }
    }, 48);
  };

  useEffect(() => {
    // Generate particles
    const colors = ['#2dd4bf', '#38bdf8', '#a78bfa', '#34d399', '#f472b6'];
    setParticles(
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 5,
        delay: i * 0.14,
        dur: 3 + Math.random() * 3,
        color: colors[i % colors.length],
        opacity: 0.1 + Math.random() * 0.2,
      }))
    );

    // Start with first message typewriter
    typeMessage(MESSAGES[0]);

    // Cycle messages
    let msgCounter = 0;
    animRef.current = setInterval(() => {
      msgCounter = (msgCounter + 1) % MESSAGES.length;
      setMsgIdx(msgCounter);
      typeMessage(MESSAGES[msgCounter]);
    }, 2000);

    // Progress bar
    let p = 0;
    const pInterval = setInterval(() => {
      p += Math.random() * 7 + 1;
      if (p > 92) p = 92;
      setProgress(p);
    }, 280);

    // Background gradient phase shift
    const bgInterval = setInterval(() => {
      setBgPhase((prev) => (prev + 1) % 4);
    }, 3000);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
      if (typeRef.current) clearInterval(typeRef.current);
      clearInterval(pInterval);
      clearInterval(bgInterval);
    };
  }, []);

  // Background gradient phases
  const bgGradients = [
    'radial-gradient(ellipse at 30% 20%, #0c2a2a 0%, #070f1e 55%, #020612 100%)',
    'radial-gradient(ellipse at 70% 30%, #0a1a2e 0%, #0c2520 55%, #020612 100%)',
    'radial-gradient(ellipse at 50% 60%, #130a2e 0%, #0a1a2a 55%, #020612 100%)',
    'radial-gradient(ellipse at 20% 70%, #0a2020 0%, #0e0a2a 55%, #020612 100%)',
  ];

  return (
    <div
      dir="rtl"
      className="relative grid min-h-screen place-items-center overflow-hidden"
      style={{
        background: bgGradients[bgPhase],
        transition: 'background 3s ease-in-out',
      }}
    >

      {/* ── Floating ambient particles ── */}
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
              background: p.color,
              opacity: p.opacity,
              filter: `blur(${p.size > 4 ? 1 : 0}px)`,
              animation: `floatUp ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* ── Animated mesh grid ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(45,212,191,1) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* ── Large glow orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            left: '50%',
            top: '45%',
            transform: 'translate(-50%,-50%)',
            background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)',
            animation: 'pulse-glow 4s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            left: '25%',
            top: '20%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
            animation: 'pulse-glow 5.5s 1.5s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 220,
            height: 220,
            right: '18%',
            bottom: '20%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
            animation: 'pulse-glow 6.5s 3s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-0 w-full max-w-xs px-4">

        {/* ── Multi-ring orbital scanner ── */}
        <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>

          {/* Outer dashed ring */}
          <span
            className="absolute rounded-full"
            style={{
              inset: 0,
              border: '1px dashed rgba(45,212,191,0.18)',
              animation: 'spin-slow 12s linear infinite',
            }}
          />

          {/* Second orbit ring */}
          <span
            className="absolute rounded-full"
            style={{
              inset: 14,
              border: '1px solid rgba(56,189,248,0.2)',
              animation: 'spin-slow 7s linear infinite reverse',
            }}
          />

          {/* Conic gradient spinner */}
          <span
            className="absolute rounded-full"
            style={{
              inset: 26,
              background: 'conic-gradient(from 0deg, transparent 65%, #2dd4bf 85%, #38bdf8 100%)',
              animation: 'spin-fast 1.6s linear infinite',
              opacity: 0.85,
            }}
          />

          {/* Inner ring */}
          <span
            className="absolute rounded-full"
            style={{
              inset: 36,
              border: '1.5px solid rgba(20,184,166,0.25)',
            }}
          />

          {/* Core glow */}
          <span
            className="absolute rounded-full"
            style={{
              inset: 44,
              background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 80%)',
              animation: 'pulse-core 2.2s ease-in-out infinite',
            }}
          />

          {/* Logo box */}
          <div
            className="relative rounded-2xl overflow-hidden bg-white"
            style={{
              width: 72,
              height: 72,
              boxShadow: '0 0 40px rgba(45,212,191,0.45), 0 0 15px rgba(56,189,248,0.2), 0 6px 28px rgba(0,0,0,0.55)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/masar-logo.png"
              alt="منصة مسار"
              className="w-full h-full object-contain p-1.5"
              style={{ animation: 'logo-breathe 3s ease-in-out infinite' }}
            />
          </div>

          {/* Orbiting dot 1 — teal */}
          <span
            className="absolute rounded-full"
            style={{
              width: 9,
              height: 9,
              background: '#2dd4bf',
              boxShadow: '0 0 12px #2dd4bf, 0 0 4px rgba(45,212,191,0.6)',
              top: '50%',
              left: '50%',
              transformOrigin: '-62px 0px',
              transform: 'translateY(-50%)',
              animation: 'orbit 1.6s linear infinite',
            }}
          />

          {/* Orbiting dot 2 — blue */}
          <span
            className="absolute rounded-full"
            style={{
              width: 6,
              height: 6,
              background: '#38bdf8',
              boxShadow: '0 0 10px #38bdf8',
              top: '50%',
              left: '50%',
              transformOrigin: '-48px 0px',
              transform: 'translateY(-50%)',
              animation: 'orbit 2.4s linear infinite reverse',
            }}
          />

          {/* Orbiting dot 3 — violet */}
          <span
            className="absolute rounded-full"
            style={{
              width: 5,
              height: 5,
              background: '#a78bfa',
              boxShadow: '0 0 8px #a78bfa',
              top: '50%',
              left: '50%',
              transformOrigin: '-72px 0px',
              transform: 'translateY(-50%) rotate(120deg)',
              animation: 'orbit 3.2s linear infinite',
            }}
          />
        </div>

        {/* ── Brand name ── */}
        <div className="mt-6 text-center" style={{ animation: 'fade-up 600ms 200ms both' }}>
          <p
            className="text-2xl font-black text-white tracking-wide"
            style={{ textShadow: '0 0 30px rgba(45,212,191,0.55), 0 2px 4px rgba(0,0,0,0.5)' }}
          >
            {'منصة '}
            <span
              style={{
                background: 'linear-gradient(90deg, #2dd4bf, #38bdf8)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              مَسَار
            </span>
          </p>
          <p className="mt-1 text-xs font-bold text-white/40 tracking-widest uppercase">
            Dr. Ismail Issa · Smart Rehab
          </p>
        </div>

        {/* ── EEG Wave bars ── */}
        <div
          className="mt-5 flex items-center gap-[3px] h-10 overflow-hidden"
          aria-hidden
          style={{ animation: 'fade-up 600ms 350ms both' }}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <span
              key={i}
              className="rounded-full shrink-0"
              style={{
                width: 2.5,
                background: i % 7 === 0
                  ? '#2dd4bf'
                  : i % 5 === 0
                  ? '#38bdf8'
                  : i % 3 === 0
                  ? 'rgba(167,139,250,0.7)'
                  : 'rgba(45,212,191,0.3)',
                animation: `eeg-bar ${0.4 + (i % 5) * 0.12}s ${i * 0.035}s ease-in-out infinite alternate`,
                height: 6,
                boxShadow: i % 7 === 0 ? '0 0 6px rgba(45,212,191,0.8)' : 'none',
              }}
            />
          ))}
        </div>

        {/* ── Typewriter message ── */}
        <div
          className="mt-4 h-6 overflow-hidden flex items-center justify-center"
          style={{ minWidth: 240, animation: 'fade-up 600ms 450ms both' }}
        >
          <p className="text-center text-sm font-bold text-white/65 typewriter-cursor">
            {displayedText}
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div
          className="mt-5 w-60 h-1.5 rounded-full overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.08)',
            animation: 'fade-up 600ms 550ms both',
          }}
        >
          <div
            className="h-full rounded-full progress-glow transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #0f766e, #2dd4bf, #38bdf8)',
              boxShadow: '0 0 10px rgba(45,212,191,0.7), 0 0 4px rgba(56,189,248,0.5)',
            }}
          />
        </div>

        {/* ── Progress percentage ── */}
        <p
          className="mt-2 text-[11px] font-bold text-white/25 tabular-nums"
          style={{ animation: 'fade-up 600ms 600ms both' }}
        >
          {Math.round(progress)}%
        </p>

        {/* ── Footer credit ── */}
        <p
          className="mt-6 text-[10px] font-bold text-white/18 text-center leading-relaxed"
          style={{ animation: 'fade-up 600ms 700ms both' }}
        >
          د. إسماعيل عيسى · التأهيل الذكي والتعلم التفاعلي
        </p>

      </div>

      {/* Keyframes for this component */}
      <style>{`
        @keyframes floatUp {
          from { transform: translateY(0) scale(1); opacity: 0.12; }
          to   { transform: translateY(-32px) scale(1.4); opacity: 0.28; }
        }
        @keyframes pulse-glow {
          from { opacity: 0.65; transform: translate(-50%,-50%) scale(0.92); }
          to   { opacity: 1;    transform: translate(-50%,-50%) scale(1.1);  }
        }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes spin-fast { to { transform: rotate(360deg); } }
        @keyframes pulse-core {
          0%,100% { opacity: 0.55; transform: scale(1);    }
          50%      { opacity: 1;    transform: scale(1.22); }
        }
        @keyframes logo-breathe {
          0%,100% { transform: scale(1);    }
          50%      { transform: scale(1.06); }
        }
        @keyframes orbit {
          to { transform: translateY(-50%) rotate(360deg); }
        }
        @keyframes eeg-bar {
          from { height: 3px;  opacity: 0.3; }
          to   { height: 36px; opacity: 1;   }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes progress-shine {
          0%   { right: -20%; }
          100% { right: 120%; }
        }
        .progress-glow {
          position: relative;
          overflow: hidden;
        }
        .progress-glow::after {
          content: '';
          position: absolute;
          top: 0;
          right: -25%;
          width: 25%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent);
          animation: progress-shine 1.6s ease-in-out infinite;
        }
        .typewriter-cursor::after {
          content: '|';
          animation: blink 0.8s step-end infinite;
          color: #2dd4bf;
          font-weight: 300;
          margin-right: 1px;
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>
    </div>
  );
}