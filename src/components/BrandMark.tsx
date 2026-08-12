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

export default function BrandMark({ size = 'md', showText = true, dark = false, isEn = false, hideNexus = true }: BrandMarkProps) {
  const markSize = sizes[size];
  const textSm = size === 'sm';

  return (
    <span className="inline-flex min-w-0 items-center gap-2 sm:gap-3">

      {/* ── Masar Logo ── */}
      <span
        className="relative inline-block shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm"
        style={{ width: markSize, height: markSize }}
      >
        <Image
          src="/brand/masar-logo.png"
          alt="شعار منصة مسار"
          fill
          className="object-contain p-0.5"
          sizes={`${markSize}px`}
          priority={size === 'lg'}
        />
      </span>

      {showText && (
        <span className="min-w-0 block">
          <span className={`block font-black leading-5 ${textSm ? 'text-sm' : 'text-base md:text-xl'} ${dark ? 'text-white' : 'text-slate-950'}`}>
            {isEn ? 'MASAR PLATFORM' : 'منصة مسار'}
          </span>
          <span className={`block text-xs font-bold ${dark ? 'text-white/68' : 'text-slate-500'}`}>
            {isEn ? 'Smart Rehabilitation & Interactive Learning' : 'التأهيل الذكي والتعلم التفاعلي'}
          </span>
        </span>
      )}

      {!hideNexus && (
        <>
          {/* ── Divider ── */}
          <span
            className={`hidden sm:block shrink-0 self-stretch w-px ${dark ? 'bg-white/20' : 'bg-slate-200'}`}
            aria-hidden="true"
          />

          {/* ── Nexus Logo ── */}
          <span
            className="relative inline-block shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-sm"
            style={{ width: markSize, height: markSize }}
          >
            <Image
              src="/brand/nexus-logo-new.webp"
              alt="شعار منصة نكسس"
              fill
              className="object-contain p-0.5"
              sizes={`${markSize}px`}
            />
          </span>

          {showText && (
            <span className="min-w-0 hidden sm:block">
              <span className={`block font-black leading-5 ${textSm ? 'text-sm' : 'text-base md:text-xl'} ${dark ? 'text-white' : 'text-slate-950'}`}>
                Nexus
              </span>
              <span className={`block text-xs font-bold ${dark ? 'text-white/68' : 'text-slate-500'}`}>
                {isEn ? 'Smart Education Platform' : 'منصة نكسس للتعليم'}
              </span>
            </span>
          )}
        </>
      )}

    </span>
  );
}
