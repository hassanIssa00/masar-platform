import Image from 'next/image';

type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  dark?: boolean;
};

const sizes = {
  sm: 40,
  md: 48,
  lg: 64,
};

export default function BrandMark({ size = 'md', showText = true, dark = false }: BrandMarkProps) {
  const markSize = sizes[size];

  return (
    <span className="inline-flex min-w-0 items-center gap-2 sm:gap-3">
      {/* Masar Logo */}
      <span
        className="relative inline-block shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-xs"
        style={{ width: markSize, height: markSize }}
      >
        <Image src="/brand/masar-logo.png" alt="شعار منصة مسار" fill className="object-contain p-0.5" sizes={`${markSize}px`} priority={size === 'lg'} />
      </span>

      {/* Plus Connector & Nexus Badge */}
      <span className="text-teal-600 font-black text-xs sm:text-sm select-none">×</span>

      {/* Nexus Logo */}
      <span
        className="relative inline-block shrink-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-800 shadow-xs"
        style={{ width: markSize, height: markSize }}
      >
        <Image src="/brand/nexus-logo.webp" alt="شعار نظام نكسس" fill className="object-contain p-0.5" sizes={`${markSize}px`} priority={size === 'lg'} />
      </span>

      {showText && (
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className={`block text-base font-black leading-5 md:text-xl ${dark ? 'text-white' : 'text-slate-950'}`}>منصة مسار</span>
            <span className="rounded-md bg-cyan-600/10 px-1.5 py-0.5 text-[10px] font-black text-cyan-700 border border-cyan-500/20">NEXUS</span>
          </span>
          <span className={`hidden text-xs font-bold sm:block ${dark ? 'text-white/68' : 'text-slate-500'}`}>التأهيل الذكي والتعلم التفاعلي</span>
        </span>
      )}
    </span>
  );
}
