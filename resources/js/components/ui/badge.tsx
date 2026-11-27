import * as React from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-destructive/30 bg-destructive/12 text-destructive',
  outline: 'border-border bg-card text-muted-foreground',
  success: 'border-primary/25 bg-primary/12 text-primary',
  warning: 'border-[#C9A66B]/40 bg-[#C9A66B]/18 text-foreground',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
        BADGE_VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
