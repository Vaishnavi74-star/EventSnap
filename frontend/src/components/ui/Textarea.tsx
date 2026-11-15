import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'flex min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400',
            'transition-all duration-150 ease-in-out',
            'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 text-rose-900',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs font-medium text-rose-600 animate-fade-in">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

