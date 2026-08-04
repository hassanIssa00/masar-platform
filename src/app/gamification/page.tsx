'use client';

import { useEffect, useState } from 'react';
import {
  Trophy, Star, Zap, Award, Plus, Sparkles, TrendingUp, Medal, Crown, Gift, Flame, Target
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getStudentPointsAll, getTransactions, awardPoints, BADGES, LEVELS,
  calculateLevel, getEarnedBadges, type StudentPoints, type Badge
} from '@/lib/gamification';
import { getStudents, type StudentRecord } from '@/lib/localDb';

export default function GamificationPage() {
  const [pointsList, setPointsList] = useState<StudentPoints[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [awardAmount, setAwardAmount] = useState(50);
  const [reason, setReason] = useState('إكمال الواجب المنزلي بنجاح');
  const [celebrationMsg, setCelebrationMsg] = useState('');

  useEffect(() => {
    setPointsList(getStudentPointsAll());
    const allSt = getStudents();
    setStudents(allSt);
    if (allSt.length > 0) setSelectedStudentId(allSt[0].id);
  }, []);

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === selectedStudentId);
    if (!st) return;

    await awardPoints(selectedStudentId, st.fullName, awardAmount, reason);
    setPointsList(getStudentPointsAll());

    setCelebrationMsg(`🎉 مبروك! تم منح ${awardAmount} نقطة لـ ${st.fullName}!`);
    setTimeout(() => setCelebrationMsg(''), 3000);
  };

  const sortedLeaderboard = [...pointsList].sort((a, b) => b.totalPoints - a.totalPoints);
  const podium = sortedLeaderboard.slice(0, 3);
  const rest = sortedLeaderboard.slice(3);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Trophy className="text-amber-500" size={28} />
                محرك التلعيب وشارات الإنجاز (Gamification Engine)
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                منح النقاط، فتح شارات التميّز، ولوحة الصدارة التشجيعية للطلاب
              </p>
            </div>
          </div>

          {/* Celebration Banner */}
          {celebrationMsg && (
            <div className="rounded-2xl bg-amber-500 p-4 text-center font-black text-slate-950 text-base shadow-lg animate-bounce">
              {celebrationMsg}
            </div>
          )}

          {/* Top 3 Podium */}
          {podium.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-6 shadow-md text-slate-950 space-y-4">
              <h2 className="text-center font-black text-xl flex items-center justify-center gap-2">
                <Crown size={24} /> قمة لوحة الشرف والتميّز <Crown size={24} />
              </h2>
              <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto items-end pt-4">
                {/* 2nd Place */}
                {podium[1] && (
                  <div className="bg-white/80 rounded-2xl p-3 text-center space-y-1 shadow-xs">
                    <span className="text-2xl">🥈</span>
                    <p className="font-black text-xs text-slate-900 truncate">{podium[1].studentName}</p>
                    <p className="font-black text-sm text-amber-700">{podium[1].totalPoints} نقطة</p>
                  </div>
                )}

                {/* 1st Place */}
                {podium[0] && (
                  <div className="bg-white rounded-2xl p-4 text-center space-y-1 shadow-md border-2 border-amber-300 transform -translate-y-2">
                    <span className="text-3xl">👑</span>
                    <p className="font-black text-sm text-slate-900 truncate">{podium[0].studentName}</p>
                    <p className="font-black text-base text-amber-800">{podium[0].totalPoints} نقطة</p>
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                      بطل المركز 🏆
                    </span>
                  </div>
                )}

                {/* 3rd Place */}
                {podium[2] && (
                  <div className="bg-white/80 rounded-2xl p-3 text-center space-y-1 shadow-xs">
                    <span className="text-2xl">🥉</span>
                    <p className="font-black text-xs text-slate-900 truncate">{podium[2].studentName}</p>
                    <p className="font-black text-sm text-amber-700">{podium[2].totalPoints} نقطة</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Award Points & Badges Grid */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Award Form */}
            <form onSubmit={handleAward} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 border-b pb-3">
                <Gift className="text-teal-600" size={20} /> منح نقاط وتشجيع طالب
              </h3>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">اختر الطالب</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                  required
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>👦 {st.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">عدد النقاط الممنوحة</label>
                <div className="flex gap-2 mb-2">
                  {[10, 25, 50, 100].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setAwardAmount(pts)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition ${
                        awardAmount === pts ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      +{pts}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">سبب التكريم والمنح</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                  required
                />
              </div>

              <button type="submit" className="w-full rounded-xl bg-teal-600 py-3 text-xs font-black text-white hover:bg-teal-700 shadow-sm">
                تأكيد ومنح النقاط الآن 🎉
              </button>
            </form>

            {/* Badges Grid */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="font-black text-slate-900 text-base border-b pb-3 flex items-center gap-2">
                <Award className="text-amber-500" size={20} /> شارات الإنجاز والتميّز المتاحة
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {BADGES.map((b) => (
                  <div key={b.id} className={`rounded-2xl p-4 border text-center space-y-2 ${b.color}`}>
                    <span className="text-3xl block">{b.icon}</span>
                    <h4 className="font-black text-xs">{b.name}</h4>
                    <p className="text-[10px] font-bold opacity-80">{b.description}</p>
                    <span className="inline-block rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-black">
                      {b.pointsRequired} نقطة
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
