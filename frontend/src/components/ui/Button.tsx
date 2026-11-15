import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] rounded-xl select-none';

    const variants = {
      default: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-glow',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200/80',
      outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-xs',
      subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
      ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70',
      destructive: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-500/40',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      default: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

