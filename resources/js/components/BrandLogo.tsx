import { cn } from '@/lib/cn';

interface BrandLogoProps {
  size?: 'sm' | 'md';
  inverted?: boolean;
  className?: string;
}

export function BrandLogo({ size = 'md', inverted = false, className }: BrandLogoProps) {
  const tileSize = size === 'sm' ? 'h-7 w-7 rounded-[8px]' : 'h-8 w-8 rounded-[9px]';
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={cn(tileSize, 'shrink-0')}
        aria-hidden="true"
      >
        <rect
          width="64"
          height="64"
          rx="16"
          fill={inverted ? '#F6F2E9' : '#2E5E4E'}
        />
        <path
          d="M16 42V29a6.5 6.5 0 0 1 13 0v13M29 42V29a6.5 6.5 0 0 1 13 0v13"
          stroke={inverted ? '#16211C' : '#F6F2E9'}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44" cy="17" r="5" fill="#D4552B" />
      </svg>
      <span className={cn('font-display font-bold tracking-[-0.035em]', textSize)}>
        <span className={inverted ? 'text-[#F6F2E9]' : 'text-[var(--ink)]'}>meeting</span>
        <span className={inverted ? 'text-[#8FC4AE]' : 'text-[#244B3E] dark:text-[#8FC4AE]'}>keun</span>
      </span>
    </span>
  );
}
