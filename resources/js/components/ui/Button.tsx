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
      'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[13px]';

    const variants = {
      primary:
        'bg-gradient-to-r from-[#0C7D6C] to-[#075D50] text-white shadow-[0_8px_20px_rgba(11,122,105,0.22)] hover:brightness-105',
      outline:
        'bg-[var(--paper-2)] text-[var(--ink)] border-[1.5px] border-[#0B7A69]/30 hover:border-[#0B7A69]/65 hover:bg-[#F5FBF9] dark:border-[#2C4A41] dark:hover:bg-[#1D2E29]',
      ghost: 'bg-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)]',
      danger: 'bg-[var(--clay)] text-white hover:bg-[var(--clay-hover)]',
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
