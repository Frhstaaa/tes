import React from 'react';
import { cn } from '@/lib/cn';

type ChipTone = 'neutral' | 'moss' | 'clay' | 'sand';

interface ChipProps {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
}

export function Chip({ children, tone = 'neutral', className }: ChipProps) {
  const tones: Record<ChipTone, string> = {
    neutral: 'border-[var(--line)] bg-[var(--paper-2)] text-[var(--ink-soft)]',
    moss: 'border-[var(--moss)]/30 bg-[var(--moss)]/12 text-[var(--moss)]',
    clay: 'border-[var(--clay)]/30 bg-[var(--clay)]/12 text-[var(--clay)]',
    sand: 'border-[var(--sand)]/40 bg-[var(--sand)]/18 text-[var(--ink)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
