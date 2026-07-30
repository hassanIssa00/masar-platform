import Image from 'next/image';

type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  dark?: boolean;
};

const sizes = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export default function BrandMark({ size = 'md', showText = true, dark = false }: BrandMarkProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      <span className={`${sizes[size]} relative shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200`}>
        <Image src="/brand/masar-logo.png" alt="شعار منصة مسار" fill className="object-cover" sizes="64px" priority={size === 'lg'} />
      </span>
      {showText && (
        <span className="min-w-0">
          <span className={`block text-base font-black leading-5 md:text-xl ${dark ? 'text-white' : 'text-slate-950'}`}>منصة مسار التأهيل</span>
          <span className={`hidden text-xs font-bold sm:block ${dark ? 'text-white/68' : 'text-slate-500'}`}>تقييم، تدخل، متابعة تقدم</span>
        </span>
      )}
    </span>
  );
}
