import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]';

    const variants = {
      primary: 'bg-[var(--moss)] text-[var(--moss-fg)] hover:bg-[var(--moss-hover)]',
      outline: 'bg-transparent text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-2)]',
      ghost: 'bg-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)]',
      danger: 'bg-[var(--clay)] text-[#F6F2E9] hover:bg-[var(--clay-hover)]',
    };

    const sizes = {
      md: 'min-h-[44px] px-4 py-2.5 text-[15px]',
      lg: 'min-h-[52px] px-5 py-3 text-[16px]',
      icon: 'min-h-[44px] min-w-[44px] p-2.5',
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
