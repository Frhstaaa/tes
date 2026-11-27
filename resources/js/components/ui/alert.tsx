import * as React from 'react';
import { cn } from '@/lib/cn';

export type AlertVariant = 'default' | 'destructive' | 'success' | 'warning';

const ALERT_VARIANTS: Record<AlertVariant, string> = {
  default: 'border-border bg-card text-card-foreground',
  destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
  success: 'border-primary/30 bg-primary/10 text-primary',
  warning: 'border-[#C9A66B]/45 bg-[#C9A66B]/15 text-foreground',
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      data-slot="alert"
      className={cn(
        'relative flex w-full flex-col gap-1 rounded-xl border px-4 py-3 text-sm',
        ALERT_VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      data-slot="alert-title"
      className={cn('font-semibold leading-snug tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="alert-description"
      className={cn('text-xs leading-relaxed opacity-90', className)}
      {...props}
    />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
