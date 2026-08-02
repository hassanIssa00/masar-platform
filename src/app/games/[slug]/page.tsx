'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowRight, Gamepad2, RotateCcw, Sparkles } from 'lucide-react';
import { getGame } from '@/data/games';

type Target = { id: number; x: number; y: number; size: number };
type Falling = { id: number; x: number; y: number };
type Obstacle = { id: number; lane: number; y: number };

export default function GamePage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const game = getGame(params.slug);
  const studentId = searchParams.get('student');
  const kidsHref = studentId ? `/kids?student=${studentId}` : '/kids';

  return (
    <div className="flex min-h-screen flex-col bg-[#07111f] text-white" dir="rtl">
      <header className="relative overflow-hidden border-b border-white/10 px-4 py-4" style={{ background: `linear-gradient(135deg, #07111f, ${game.color})` }}>
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href={kidsHref} className="inline-flex items-center gap-2 rounded-lg bg-white/12 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/18">
          <ArrowRight size={17} />
            رجوع للألعاب
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-xs font-black text-white/70">مهمة تدريبية قصيرة</p>
            <h1 className="truncate text-xl font-black md:text-3xl">{game.title}</h1>
            <p className="hidden text-xs font-bold text-white/70 sm:block">{game.skill}</p>
          </div>
          <Link href={kidsHref} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-white/90">
            <Gamepad2 size={17} />
            صفحتي
          </Link>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {game.kind === 'targets' && <TargetsGame color={game.color} />}
        {game.kind === 'collector' && <CollectorGame color={game.color} />}
        {game.kind === 'racer' && <RacerGame color={game.color} />}
        {game.kind === 'memory' && <MemoryGame color={game.color} />}
        {game.kind === 'paint' && <PaintGame color={game.color} />}
        {game.kind === 'snake' && <SnakeGame color={game.color} />}
        {game.kind === 'piano' && <PianoGame color={game.color} />}
        {game.kind === 'focus' && <TargetsGame color={game.color} />}
      </main>
    </div>
  );
}

function GameShell({
  score,
  title,
  onReset,
  children,
}: {
  score: number;
  title: string;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-[calc(100svh-81px)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-950">
            <Sparkles size={18} />
          </span>
          <p className="truncate text-sm font-black text-white/78">{title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-white px-4 py-2 text-sm font-black text-slate-950">النقاط: {score}</span>
          <button onClick={onReset} className="grid h-10 w-10 place-items-center rounded-lg bg-white/12 text-white ring-1 ring-white/10 hover:bg-white/18" title="إعادة">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px),linear-gradient(#fff_1px,transparent_1px)] [background-size:34px_34px]" />
        {children}
      </div>
    </section>
  );
}

function TargetsGame({ color }: { color: string }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTargets((items) => [
        ...items.slice(-7),
        {
          id: Date.now(),
          x: 8 + Math.random() * 76,
          y: 12 + Math.random() * 68,
          size: 46 + Math.random() * 36,
        },
      ]);
    }, 650);
    return () => clearInterval(interval);
  }, [running]);

  const reset = () => {
    setScore(0);
    setTargets([]);
    setRunning(true);
  };

  return (
    <GameShell score={score} title="اضغط الأهداف المتحركة بسرعة" onReset={reset}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#31536f,#020617)]" />
      <div className="absolute right-5 top-5 rounded-lg bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15">
        اضغط الدوائر قبل أن تزيد
      </div>
      {targets.map((target) => (
        <button
          key={target.id}
          onClick={() => {
            setScore((value) => value + 10);
            setTargets((items) => items.filter((item) => item.id !== target.id));
          }}
          className="absolute rounded-full border-4 border-white shadow-2xl transition hover:scale-110 active:scale-90"
          style={{ left: `${target.x}%`, top: `${target.y}%`, width: target.size, height: target.size, backgroundColor: color }}
          aria-label="هدف"
        >
          <span className="absolute inset-3 rounded-full border-4 border-white/70" />
          <span className="absolute inset-6 rounded-full bg-white" />
        </button>
      ))}
      <button onClick={() => setRunning((value) => !value)} className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-xl">
        {running ? 'إيقاف مؤقت' : 'استكمال'}
      </button>
    </GameShell>
  );
}

function CollectorGame({ color }: { color: string }) {
  const [items, setItems] = useState<Falling[]>([]);
  const [score, setScore] = useState(0);
  const [player, setPlayer] = useState(50);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems((current) => {
        const moved = current.map((item) => ({ ...item, y: item.y + 4 })).filter((item) => item.y < 105);
        const caught = moved.filter((item) => item.y > 80 && Math.abs(item.x - player) < 12).length;
        if (caught) setScore((value) => value + caught * 10);
        return [...moved.filter((item) => !(item.y > 80 && Math.abs(item.x - player) < 12)), { id: Date.now(), x: 8 + Math.random() * 84, y: -5 }];
      });
    }, 420);
    return () => clearInterval(interval);
  }, [player]);

  const reset = () => {
    setItems([]);
    setScore(0);
    setPlayer(50);
  };

  return (
    <GameShell score={score} title="حرّك الشريط واجمع القطع الساقطة" onReset={reset}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0f1f3d,#020617)]" />
      {items.map((item) => (
        <span key={item.id} className="absolute h-8 w-8 rotate-45 rounded-md border-2 border-white shadow-lg" style={{ left: `${item.x}%`, top: `${item.y}%`, backgroundColor: color }} />
      ))}
      <div className="absolute bottom-12 h-8 w-32 -translate-x-1/2 rounded-full bg-white shadow-2xl ring-4 ring-white/20" style={{ left: `${player}%` }} />
      <div className="absolute inset-x-4 bottom-3 flex justify-between">
        <button onClick={() => setPlayer((value) => Math.max(10, value - 10))} className="h-14 w-28 rounded-lg bg-white/15 text-2xl font-black text-white ring-1 ring-white/10">يمين</button>
        <button onClick={() => setPlayer((value) => Math.min(90, value + 10))} className="h-14 w-28 rounded-lg bg-white/15 text-2xl font-black text-white ring-1 ring-white/10">يسار</button>
      </div>
    </GameShell>
  );
}

function RacerGame({ color }: { color: string }) {
  const [lane, setLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [crashed, setCrashed] = useState(false);

  useEffect(() => {
    if (crashed) return;
    const interval = setInterval(() => {
      setObstacles((current) => {
        const moved = current.map((item) => ({ ...item, y: item.y + 5 }));
        const hit = moved.some((item) => item.lane === lane && item.y > 72 && item.y < 90);
        if (hit) setCrashed(true);
        const passed = moved.filter((item) => item.y >= 105).length;
        if (passed) setScore((value) => value + passed * 5);
        return [...moved.filter((item) => item.y < 105), { id: Date.now(), lane: Math.floor(Math.random() * 3), y: -12 }];
      });
    }, 520);
    return () => clearInterval(interval);
  }, [lane, crashed]);

  const reset = () => {
    setLane(1);
    setObstacles([]);
    setScore(0);
    setCrashed(false);
  };

  const laneLeft = (value: number) => ['18%', '50%', '82%'][value];

  return (
    <GameShell score={score} title="غيّر المسار وتجنب العوائق" onReset={reset}>
      <div className="absolute inset-0 mx-auto max-w-xl bg-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.08),transparent)]" />
        <div className="absolute inset-y-0 left-1/3 border-l-4 border-dashed border-white/25" />
        <div className="absolute inset-y-0 left-2/3 border-l-4 border-dashed border-white/25" />
        {obstacles.map((item) => (
          <div key={item.id} className="absolute h-16 w-16 -translate-x-1/2 rounded-lg border-2 border-white bg-rose-600" style={{ left: laneLeft(item.lane), top: `${item.y}%` }} />
        ))}
        <div className="absolute bottom-10 h-16 w-16 -translate-x-1/2 rounded-lg border-4 border-white" style={{ left: laneLeft(lane), backgroundColor: color }} />
      </div>
      {crashed && <div className="absolute inset-0 grid place-items-center bg-slate-950/75 text-center backdrop-blur-sm"><button onClick={reset} className="rounded-lg bg-white px-8 py-4 text-xl font-black text-slate-950 shadow-2xl">إعادة اللعب</button></div>}
      <div className="absolute inset-x-4 bottom-3 flex justify-between">
        <button onClick={() => setLane((value) => Math.max(0, value - 1))} className="h-14 w-28 rounded-lg bg-white/15 text-xl font-black text-white">يمين</button>
        <button onClick={() => setLane((value) => Math.min(2, value + 1))} className="h-14 w-28 rounded-lg bg-white/15 text-xl font-black text-white">يسار</button>
      </div>
    </GameShell>
  );
}

function MemoryGame({ color }: { color: string }) {
  const cards = useMemo(() => ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'أخضر', 'أحمر', 'أصفر', 'أزرق'], []);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  const click = (index: number) => {
    if (open.length === 2 || open.includes(index) || done.includes(index)) return;
    const next = [...open, index];
    setOpen(next);
    if (next.length === 2) {
      if (cards[next[0]] === cards[next[1]]) {
        setDone((items) => [...items, ...next]);
        setScore((value) => value + 20);
      }
      setTimeout(() => setOpen([]), 700);
    }
  };

  return (
    <GameShell score={score} title="اكشف بطاقتين وحاول المطابقة" onReset={() => window.location.reload()}>
      <div className="grid h-full place-items-center p-4">
        <div className="grid w-full max-w-xl grid-cols-4 gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          {cards.map((card, index) => {
            const visible = open.includes(index) || done.includes(index);
            return (
              <button key={`${card}-${index}`} onClick={() => click(index)} className="aspect-square rounded-lg border border-white/20 text-xl font-black shadow-lg transition hover:-translate-y-1 active:scale-95" style={{ backgroundColor: visible ? color : '#ffffff', color: visible ? 'white' : '#0f172a' }}>
                {visible ? card : ''}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}

function PaintGame({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [drawing, setDrawing] = useState(false);

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawing) return;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = color;
    context.beginPath();
    context.arc(event.clientX - rect.left, event.clientY - rect.top, 8, 0, Math.PI * 2);
    context.fill();
    setScore((value) => value + 1);
  };

  const reset = () => {
    const context = canvasRef.current?.getContext('2d');
    if (context && canvasRef.current) context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setScore(0);
  };

  return (
    <GameShell score={score} title="ارسم بالقلم داخل المساحة البيضاء" onReset={reset}>
      <div className="grid h-full place-items-center p-4">
        <canvas ref={canvasRef} width={900} height={520} onPointerDown={() => setDrawing(true)} onPointerUp={() => setDrawing(false)} onPointerMove={draw} className="h-full max-h-[520px] w-full max-w-5xl touch-none rounded-lg bg-white shadow-2xl ring-8 ring-white/10" />
      </div>
    </GameShell>
  );
}

function SnakeGame({ color }: { color: string }) {
  const [head, setHead] = useState({ x: 5, y: 5 });
  const [food, setFood] = useState({ x: 9, y: 8 });
  const [score, setScore] = useState(0);

  const move = (dx: number, dy: number) => {
    setHead((current) => {
      const next = { x: Math.max(0, Math.min(11, current.x + dx)), y: Math.max(0, Math.min(11, current.y + dy)) };
      if (next.x === food.x && next.y === food.y) {
        setScore((value) => value + 10);
        setFood({ x: Math.floor(Math.random() * 12), y: Math.floor(Math.random() * 12) });
      }
      return next;
    });
  };

  return (
    <GameShell score={score} title="حرّك المربع واجمع النقطة" onReset={() => { setHead({ x: 5, y: 5 }); setScore(0); }}>
      <div className="grid h-full place-items-center p-4">
        <div className="grid aspect-square w-full max-w-[520px] grid-cols-12 gap-1 rounded-lg bg-white/10 p-2 ring-1 ring-white/10">
          {Array.from({ length: 144 }).map((_, index) => {
            const x = index % 12;
            const y = Math.floor(index / 12);
            const isHead = head.x === x && head.y === y;
            const isFood = food.x === x && food.y === y;
            return <div key={index} className="rounded-sm bg-white/10" style={{ backgroundColor: isHead ? color : isFood ? '#ffffff' : undefined }} />;
          })}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 grid -translate-x-1/2 grid-cols-3 gap-2">
        <span />
        <button onClick={() => move(0, -1)} className="h-12 w-16 rounded-lg bg-white/15 font-black">أعلى</button>
        <span />
        <button onClick={() => move(1, 0)} className="h-12 w-16 rounded-lg bg-white/15 font-black">يمين</button>
        <button onClick={() => move(0, 1)} className="h-12 w-16 rounded-lg bg-white/15 font-black">أسفل</button>
        <button onClick={() => move(-1, 0)} className="h-12 w-16 rounded-lg bg-white/15 font-black">يسار</button>
      </div>
    </GameShell>
  );
}

function PianoGame({ color }: { color: string }) {
  const [score, setScore] = useState(0);
  const notes = [261, 293, 329, 349, 392, 440, 493, 523];

  const play = (frequency: number) => {
    const audio = new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
    osc.start();
    osc.stop(audio.currentTime + 0.35);
    setScore((value) => value + 5);
  };

  return (
    <GameShell score={score} title="اضغط المفاتيح واستمع للنغمات" onReset={() => setScore(0)}>
      <div className="grid h-full place-items-center p-4">
        <div className="flex h-72 w-full max-w-3xl items-end gap-2 rounded-lg bg-white p-3 shadow-2xl ring-8 ring-white/10">
          {notes.map((note, index) => (
            <button key={note} onClick={() => play(note)} className="h-full flex-1 rounded-b-lg border border-slate-300 text-lg font-black text-slate-950 active:translate-y-1" style={{ backgroundColor: index % 2 ? '#e2e8f0' : '#ffffff', borderTop: `12px solid ${color}` }}>
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
