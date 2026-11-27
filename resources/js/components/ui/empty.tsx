import * as React from 'react';
import { cn } from '@/lib/cn';

export function Empty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/80 px-6 py-10 text-center',
        className
      )}
      {...props}
    />
  );
}

export function EmptyMedia({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        'flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="empty-title"
      className={cn('font-display text-base font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function EmptyDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="empty-description"
      className={cn('max-w-sm text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
