import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30';

    const primaryStyle =
      'bg-gradient-to-r from-[#0C7D6C] to-[#075D50] text-primary-foreground shadow-[0_8px_20px_rgba(11,122,105,0.22)] hover:brightness-105';
    const destructiveStyle = 'bg-destructive text-destructive-foreground hover:brightness-105';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary: primaryStyle,
      default: primaryStyle,
      secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
      outline:
        'bg-card text-foreground border border-primary/30 hover:border-primary/65 hover:bg-accent',
      ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent',
      danger: destructiveStyle,
      destructive: destructiveStyle,
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'min-h-[36px] px-3 py-1.5 text-sm',
      md: 'min-h-[44px] px-4 py-2.5 text-[15px]',
      lg: 'min-h-[52px] px-5 py-3 text-[16px]',
      icon: 'size-10 p-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
