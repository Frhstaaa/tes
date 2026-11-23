import React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--ink)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'min-h-[44px] w-full rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 py-2.5 text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-soft)]/70 transition-colors duration-150',
            'focus:border-[var(--moss)] focus:bg-[var(--paper)] focus:outline-none',
            error && 'border-[var(--clay)] focus:border-[var(--clay)]',
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
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
