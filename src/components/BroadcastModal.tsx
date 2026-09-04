'use client';

import { useState } from 'react';
import { Megaphone, Send, X, CheckCircle2 } from 'lucide-react';
import { createNotification } from '@/lib/notifications';

export default function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('تنويه هام من إدارة منصة مسار');
  const [body, setBody] = useState('نود إحاطتكم علماً بمواعيد الجلسات التفاعلية القادمة وضرورة متابعة الأنشطة المنزلية.');
  const [sent, setSent] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await createNotification({
      type: 'system',
      title,
      body,
      link: '/school-parent',
      targetRole: 'parent',
    });
    setSent(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs grid place-items-center">
      <form
        onSubmit={handleSend}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="text-amber-500" size={20} />
            <h3 className="font-black text-slate-900 text-lg">بث إعلان جماعي لجميع الأسر</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <p className="font-black text-slate-900 text-base">تم إرسال الإعلان بنجاح لجميع أولياء الأمور!</p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">عنوان التنويه / الإعلان</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">نص الإعلان الجماعي</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 text-xs font-black text-slate-500">
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 hover:bg-amber-400 shadow-sm"
              >
                <Send size={15} /> إرسال لجميع العائلات
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
