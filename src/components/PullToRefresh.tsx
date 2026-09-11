'use client';

import { useEffect, useRef, useState } from 'react';

const PULL_THRESHOLD = 80; // px needed to trigger refresh
const MAX_PULL = 130;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [released, setReleased] = useState(false);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY !== 0) return;
      startY.current = e.touches[0].clientY;
      isDragging.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) return;
      if (window.scrollY !== 0) return;
      isDragging.current = true;
      const clamped = Math.min(delta * 0.55, MAX_PULL);
      setPullY(clamped);
    };

    const onTouchEnd = () => {
      if (!isDragging.current) { startY.current = null; return; }
      isDragging.current = false;
      startY.current = null;
      setReleased(true);
      if (pullY >= PULL_THRESHOLD) {
        setRefreshing(true);
        setTimeout(() => {
          window.location.reload();
        }, 900);
      } else {
        setPullY(0);
        setTimeout(() => setReleased(false), 350);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullY]);

  const progress = Math.min(pullY / PULL_THRESHOLD, 1);
  const isReady = progress >= 1;
  const isVisible = pullY > 4 || refreshing;

  return (
    <>
      {/* Pull indicator */}
      {isVisible && (
        <div
          className="fixed inset-x-0 top-0 z-[999] flex items-center justify-center pointer-events-none"
          style={{
            height: Math.max(pullY, refreshing ? 72 : 0),
            transition: released ? 'height 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          }}
        >
          <div
            className="flex flex-col items-center gap-2"
            style={{
              opacity: Math.min(progress * 2, 1),
              transform: `scale(${0.6 + progress * 0.4}) translateY(${refreshing ? 0 : -4}px)`,
              transition: released ? 'transform 0.35s ease' : 'none',
            }}
          >
            {/* Logo ring */}
            <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
              {/* Outer spinning ring */}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  border: '2px solid rgba(45,212,191,0.3)',
                  animation: refreshing ? 'ptr-spin 1s linear infinite' : 'none',
                  transform: refreshing ? undefined : `rotate(${progress * 240}deg)`,
                  background: isReady ? 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)' : 'transparent',
                  transition: 'background 0.3s',
                }}
              />
              {/* Conic progress arc */}
              {!refreshing && (
                <span
                  className="absolute inset-[3px] rounded-full"
                  style={{
                    background: `conic-gradient(from 0deg, #2dd4bf ${Math.round(progress * 360)}deg, transparent ${Math.round(progress * 360)}deg)`,
                    opacity: 0.6,
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), white calc(100% - 2.5px))',
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), white calc(100% - 2.5px))',
                  }}
                />
              )}
              {/* Logo */}
              <div
                className="rounded-xl overflow-hidden bg-white"
                style={{
                  width: 32,
                  height: 32,
                  boxShadow: '0 0 12px rgba(45,212,191,0.5)',
                  animation: refreshing ? 'ptr-pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                {/* eslint-disable-next-line @next/text/no-img-element */}
                <img src="/brand/masar-logo.png" alt="" className="w-full h-full object-contain p-0.5" />
              </div>
            </div>
            {/* Label */}
            <p
              className="text-[11px] font-black"
              style={{
                color: isReady ? '#2dd4bf' : 'rgba(255,255,255,0.6)',
                textShadow: isReady ? '0 0 12px rgba(45,212,191,0.8)' : 'none',
                transition: 'color 0.3s',
                direction: 'rtl',
              }}
            >
              {refreshing ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u062f\u064a\u062b\u2026' : isReady ? '\u0627\u0631\u0641\u0639 \u0644\u0644\u062a\u062d\u062f\u064a\u062b \u2705' : '\u0627\u0633\u062d\u0628 \u0644\u0644\u0623\u0633\u0641\u0644 \u0644\u0644\u062a\u062d\u062f\u064a\u062b'}
            </p>
          </div>
        </div>
      )}

      {/* Backdrop blur when pulling */}
      {isVisible && !refreshing && (
        <div
          className="fixed inset-x-0 top-0 pointer-events-none z-[998]"
          style={{
            height: Math.max(pullY, 0),
            background: 'linear-gradient(to bottom, rgba(10,15,30,0.85) 0%, transparent 100%)',
            backdropFilter: `blur(${progress * 4}px)`,
            transition: released ? 'height 0.35s ease' : 'none',
          }}
        />
      )}

      {/* Page content shifted down while pulling */}
      <div
        style={{
          transform: `translateY(${refreshing ? 72 : pullY}px)`,
          transition: released || refreshing ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes ptr-spin { to { transform: rotate(360deg); } }
        @keyframes ptr-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
      `}</style>
    </>
  );
}