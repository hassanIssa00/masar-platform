import Image from 'next/image';

type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  dark?: boolean;
  isEn?: boolean;
  hideNexus?: boolean;
};

const sizes = {
  sm: 36,
  md: 44,
  lg: 58,
};

export default function BrandMark({ size = 'md', showText = true, dark = false, isEn = false, hideNexus = false }: BrandMarkProps) {
  const markSize = sizes[size];
  const textSm = size === 'sm';

  return (
    <span className="inline-flex min-w-0 items-center gap-2 sm:gap-3">
      {/* ── Nexus Logo (Primary Platform Brand) ── */}
      <span
        className="relative inline-block shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-teal-500/10 via-white to-blue-500/10 ring-1 ring-teal-500/30 shadow-sm"
        style={{ width: markSize, height: markSize }}
      >
        <Image
          src="/brand/nexus-logo-new.webp"
          alt="شعار منصة نكسس"
          fill
          className="object-contain p-1"
          sizes={`${markSize}px`}
          priority={size === 'lg'}
        />
      </span>

      {showText && (
        <span className="min-w-0 block">
          <span className={`block font-black leading-5 tracking-tight ${textSm ? 'text-sm' : 'text-base md:text-xl'} ${dark ? 'text-white' : 'text-slate-950'}`}>
            {isEn ? 'NEXUS PLATFORM' : 'منصة نِكْسَس'}
          </span>
          <span className={`block text-[11px] sm:text-xs font-bold ${dark ? 'text-teal-300' : 'text-teal-700'}`}>
            {isEn ? 'Next-Gen Smart Education & Learning' : 'التعليم الذكي والتأهيل المتقدم'}
          </span>
        </span>
      )}
    </span>
  );
}
