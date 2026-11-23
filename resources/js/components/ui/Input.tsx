import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, type, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);

    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--ink)]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            className={cn(
              'min-h-[44px] w-full rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 py-2.5 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-soft)]/70 transition-colors duration-150',
              'focus:border-[var(--moss)] focus:bg-[var(--paper)] focus:outline-none',
              isPassword && 'pr-11',
              error && 'border-[var(--clay)] focus:border-[var(--clay)]',
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Eye className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[var(--clay)]" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-[var(--ink-soft)]">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
