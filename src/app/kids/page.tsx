'use client';

import Link from 'next/link';
import { Gamepad2, Play, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { games } from '@/data/games';

export default function KidsDashboard() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-6 md:p-8">
              <p className="text-sm font-black text-teal-800">بوابة ألعاب الطالب</p>
              <h1 className="mt-2 text-4xl font-black leading-tight text-slate-950 md:text-5xl">
                ألعاب متصفح حقيقية للتركيز والذاكرة والتآزر
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-8 text-slate-600">
                ليست أسئلة مذاكرة. كل لعبة لها منطق لعب مستقل، نقاط، وقت، وحركة مباشرة مناسبة للطفل على الموبايل والكمبيوتر.
              </p>
            </div>
            <div className="grid min-h-56 place-items-center bg-slate-950 p-6 text-white">
              <div className="text-center">
                <Gamepad2 className="mx-auto" size={56} />
                <p className="mt-4 text-4xl font-black">{games.length}</p>
                <p className="mt-1 text-sm font-bold text-white/70">ألعاب تفاعلية</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {games.map((game) => (
            <Link key={game.slug} href={`/games/${game.slug}`} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="h-2" style={{ backgroundColor: game.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-lg text-white" style={{ backgroundColor: game.color }}>
                    <Play size={22} fill="currentColor" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{game.kind}</span>
                </div>
                <h2 className="mt-5 text-xl font-black text-slate-950">{game.title}</h2>
                <p className="mt-2 min-h-12 text-sm font-bold leading-6 text-slate-600">{game.description}</p>
                <div className="mt-5 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                    <Trophy size={15} />
                    المهارة
                  </div>
                  <p className="mt-1 text-sm font-black text-slate-800">{game.skill}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
