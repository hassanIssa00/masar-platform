import BrandMark from '@/components/BrandMark';

export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white" dir="rtl">
      <div className="motion-scale-in w-full max-w-sm rounded-lg border border-white/15 bg-white/10 p-7 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto flex justify-center">
          <BrandMark size="lg" showText={false} />
        </div>
        <span className="mx-auto mt-6 block h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-teal-300" />
        <h1 className="mt-5 text-2xl font-black">جاري تجهيز الصفحة</h1>
        <p className="mt-2 text-sm font-bold leading-7 text-white/70">نرتب البيانات ونفتح الخطوة التالية في مسار الطالب.</p>
      </div>
    </div>
  );
}
