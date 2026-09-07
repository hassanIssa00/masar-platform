import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, CheckCircle2, Mail, Building2, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية وحماية البيانات | منصة مسار التعليمية',
  description: 'سياسة الخصوصية وحماية البيانات الشخصية لطلاب وأولياء أمور منصة مسار وفصل د. إسماعيل عيسى وفقاً للأنظمة المعتمدة.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-teal-800 text-base hover:opacity-90 transition">
            <span className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center text-sm font-black">م</span>
            <span>منصة مسار للتعليم الذكي</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-black text-slate-600 hover:text-teal-700 transition">
            <span>العودة للرئيسية</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        <div className="bg-gradient-to-l from-teal-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-teal-200">
            <ShieldCheck size={16} />
            <span>إشعار الخصوصية والشفافية (Privacy Policy & Data Protection)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            سياسة الخصوصية وحماية البيانات الشخصية
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            تلتزم منصة مسار التعليمية وفصل د. إسماعيل عيسى بأعلى معايير حماية وخصوصية البيانات الشخصية للأطفال والطلاب وأولياء الأمور وفقاً لنظام حماية البيانات الشخصية بالمملكة العربية السعودية والقانون رقم 151 لسنة 2020 لحماية البيانات الشخصية.
          </p>
          <p className="text-[11px] font-bold text-teal-300 pt-2 border-t border-white/10">
            تاريخ آخر تحديث: سبتمبر 2026 — الإصدار المعتمد V6.0
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">1</span>
              <h2 className="text-base font-black text-slate-900">مقدمة والجهة المسؤولة عن معالجة البيانات</h2>
            </div>
            <p>
              توضح هذه السياسة كيفية جمع واستخدام وتخزين وحماية البيانات الشخصية التي يقدمها أولياء الأمور والطلاب عند استخدام منصة مسار (masarplatform.org) وبوابات التعليم وفصول التأهيل تحت إشراف د. إسماعيل عيسى.
            </p>
            <p>
              يُعتبر المشرف الأكاديمي والإداري للمنصة (د. إسماعيل عيسى وفريق العمل المصرح له) هو المتحكم في البيانات (Data Controller)، ومسؤولاً عن معالجتها حصرياً للأغراض التعليمية والتأهيلية المصرّح بها.
            </p>
          </section>

          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">2</span>
              <h2 className="text-base font-black text-slate-900">ما هي البيانات التي نجمعها؟</h2>
            </div>
            <p>نجمع فقط البيانات الضرورية لتقديم الخدمة التعليمية والتشخيصية للأطفال:</p>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <span><strong>بيانات ولي الأمر:</strong> الاسم، رقم الهاتف (للتواصل وإرسال التقارير المدرسية عبر الواتساب)، والبريد الإلكتروني.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <span><strong>بيانات الطالب:</strong> الاسم الكامل، الاسم بالإنجليزية، الصف الدراسي، العمر، تاريخ الميلاد، ورقم الهوية الوطنية/الإقامة في حال تسجيله رسمياً للشهادات.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <span><strong>البيانات الأكاديمية والتشخيصية:</strong> نتائج استبيان ولى الأمر، درجات الواجبات والاختبارات، تقارير تحديد المستوى، وسجلات الحضور والغياب.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
                <span><strong>بيانات التحقق الاختيارية:</strong> بصمة الوجه الذكية للطلاب الصغار، وتتم معالجتها محلياً عبر تقنيات مشفرة لمنع الحاجة لكتابة كلمات مرور معقدة على الأطفال.</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">3</span>
              <h2 className="text-base font-black text-slate-900">أغراض استخدام ومعالجة البيانات</h2>
            </div>
            <p>تُستخدم البيانات التي تم جمعها حصرياً للأغراض المشروعة التالية:</p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-black text-slate-900 block mb-1">التقييم والتشخيص الأكاديمي:</span>
                تحديد المسار العلاجي المناسب للطفل (صعوبات قراءة، حساب، تركيز).
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-black text-slate-900 block mb-1">متابعة الواجبات والكويزات:</span>
                تخصيص وإسناد التمارين التعليمية وتصحيحها ومتابعة مستوى تقدم الطالب.
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-black text-slate-900 block mb-1">إصدار الشهادات والتقارير:</span>
                توليد وطباعة بطاقات التميز والتقارير الدورية الرسمية لأولياء الأمور.
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-black text-slate-900 block mb-1">التواصل المباشر مع الأسرة:</span>
                إرسال إشعارات الحصص والتنبيهات المباشرة عبر الرسائل والواتساب.
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">4</span>
              <h2 className="text-base font-black text-slate-900">الأمان وتدابير الحماية التقنية</h2>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <Lock size={15} className="text-teal-600 shrink-0" />
                <span><strong>التشفير أثناء النقل:</strong> يتم تشفير جميع الاتصالات والبيانات عبر بروتوكولات التشفير الحديثة TLS 1.3 و HTTPS.</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock size={15} className="text-teal-600 shrink-0" />
                <span><strong>تجزئة وتشفير كلمات المرور:</strong> يتم استخدام خوارزميات التجزئة المشفرة المعيارية (Bcrypt) لضمان عدم حفظ كلمات المرور بنص صريح.</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock size={15} className="text-teal-600 shrink-0" />
                <span><strong>حماية الجلسات:</strong> يتم تأمين الجلسات عبر ملفات تعريف ارتباط مشفرة ومحمية بخاصية (HttpOnly / Secure Cookies).</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock size={15} className="text-teal-600 shrink-0" />
                <span><strong>عزل البيانات والصلاحيات:</strong> يتم عزل بيانات الطلاب وقصر الاطلاع عليها على المعلم المشرف وولي الأمر الموثق فقط.</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">5</span>
              <h2 className="text-base font-black text-slate-900">مشاركة البيانات مع أطراف ثالثة</h2>
            </div>
            <p className="font-bold text-rose-700">
              نؤكد بشكل قاطع: لا نقوم ببيع أو تأجير أو مشاركة أي بيانات شخصية أو طلابية لأي أطراف تجارية أو إعلانية على الإطلاق.
            </p>
            <p>
              تتم استضافة البيانات على خوادم سحابية مؤمنة ومعتمدة (Google Cloud Firestore / Vercel Enterprise Infrastructure) وفقاً لاتفاقيات معالجة بيانات صارمة تضمن الخصوصية الكاملة.
            </p>
          </section>

          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">6</span>
              <h2 className="text-base font-black text-slate-900">حقوق صاحب البيانات (أولياء الأمور)</h2>
            </div>
            <p>
              بموجب أنظمة حماية البيانات الشخصية، يحق لولي الأمر في أي وقت:
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm list-disc list-inside text-slate-600 pr-2">
              <li>حق الاطلاع والوصول إلى بيانات طفله المسجلة في المنصة.</li>
              <li>حق طلب تصحيح أو تحديث أي بيانات غير دقيقة (الاسم، الهوية، تاريخ الميلاد).</li>
              <li>حق طلب حذف سجلات الطالب نهائياً من قاعدة البيانات السحابية.</li>
              <li>حق سحب الموافقة على أي خدمة تعليمية أو إشعار في أي وقت.</li>
            </ul>
          </section>

          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black">7</span>
              <h2 className="text-base font-black text-slate-900">التواصل والاستفسارات</h2>
            </div>
            <p>
              لأي استفسارات تتعلق بسياسة الخصوصية أو لممارسة حقوقك المتعلقة ببياناتك، يرجى التواصل مع إدارة المنصة:
            </p>
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-2 text-xs font-bold text-teal-950">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-teal-700" />
                <span>منصة مسار التعليمية الذكية — إشراف د. إسماعيل عيسى</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-teal-700" />
                <span>البريد المخصص للخصوصية: <a href="mailto:privacy@masarplatform.org" className="underline font-mono">privacy@masarplatform.org</a></span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs font-bold text-slate-500 mt-12">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} منصة مسار للتعليم الذكي. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-slate-900">الرئيسية</Link>
            <span>•</span>
            <Link href="/privacy" className="text-teal-700 hover:text-teal-900 font-black">سياسة الخصوصية (Privacy Policy)</Link>
            <span>•</span>
            <Link href="/auth/login" className="hover:text-slate-900">تسجيل الدخول</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}