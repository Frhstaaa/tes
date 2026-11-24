import { Video } from 'lucide-react';
import { cn } from '@/lib/cn';

interface BrandLogoProps {
  size?: 'sm' | 'md';
  inverted?: boolean;
  className?: string;
}

export function BrandLogo({ size = 'md', inverted = false, className }: BrandLogoProps) {
  const tileSize = size === 'sm' ? 'h-8 w-8 rounded-[10px]' : 'h-10 w-10 rounded-[12px]';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-[17px]' : 'text-[19px]';

  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <span
        className={cn(
          tileSize,
          'inline-flex shrink-0 items-center justify-center shadow-sm',
          inverted
            ? 'bg-white text-[#0B7A69]'
            : 'bg-gradient-to-br from-[#10937F] to-[#086254] text-white'
        )}
        aria-hidden="true"
      >
        <Video className={cn(iconSize, 'fill-current')} strokeWidth={1.8} />
      </span>
      <span
        className={cn(
          'font-display font-bold tracking-[-0.03em]',
          textSize,
          inverted ? 'text-white' : 'text-[var(--ink)]'
        )}
      >
        Meeting<span className={inverted ? 'text-[#A7F3D0]' : 'text-[#0B7A69] dark:text-[#5EEAD4]'}>Keun</span>
      </span>
    </span>
  );
}
