import Image from 'next/image';

type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  dark?: boolean;
  isEn?: boolean;
};

const sizes = {
  sm: 40,
  md: 48,
  lg: 64,
};

export default function BrandMark({ size = 'md', showText = true, dark = false, isEn = false }: BrandMarkProps) {
  const markSize = sizes[size];

  return (
    <span className="inline-flex min-w-0 items-center gap-2 sm:gap-3">
      {/* Masar Logo Only */}
      <span
        className="relative inline-block shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 shadow-xs"
        style={{ width: markSize, height: markSize }}
      >
        <Image src="/brand/masar-logo.png" alt="شعار منصة مسار" fill className="object-contain p-0.5" sizes={`${markSize}px`} priority={size === 'lg'} />
      </span>

      {showText && (
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className={`block text-base font-black leading-5 md:text-xl ${dark ? 'text-white' : 'text-slate-950'}`}>
              {isEn ? 'MASAR PLATFORM' : 'منصة مسار'}
            </span>
          </span>
          <span className={`hidden text-xs font-bold sm:block ${dark ? 'text-white/68' : 'text-slate-500'}`}>
            {isEn ? 'Smart Rehabilitation & Interactive Learning' : 'التأهيل الذكي والتعلم التفاعلي'}
          </span>
        </span>
      )}
    </span>
  );
}
