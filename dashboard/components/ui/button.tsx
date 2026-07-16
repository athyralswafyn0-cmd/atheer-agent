'use client';

import { ReactNode, forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading = false, leftIcon, rightIcon, fullWidth = false, disabled, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 ease-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-space
      disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none
      relative overflow-hidden
    `;

    const variantStyles = {
      default: `
        bg-gradient-to-r from-gold to-gold-light text-space
        border border-gold/30
        hover:from-gold-light hover:to-gold
        hover:shadow-[0_10px_40px_rgba(212,168,67,0.4)]
        hover:border-gold/50
        active:scale-[0.98]
        shadow-[0_4px_20px_rgba(212,168,67,0.3)]
      `,
      outline: `
        bg-transparent text-ink
        border-2 border-white/20
        hover:bg-white/5
        hover:border-gold/50
        hover:text-gold
        hover:shadow-[0_10px_40px_rgba(212,168,67,0.2)]
      `,
      secondary: `
        bg-amethyst/20 text-ink
        border border-amethyst/30
        hover:bg-amethyst/30
        hover:border-amethyst/50
        hover:shadow-[0_10px_40px_rgba(91,75,138,0.3)]
        text-lavender
      `,
      ghost: `
        bg-transparent text-ink
        hover:bg-white/5
        hover:text-gold
      `,
      link: `
        bg-transparent text-gold underline-offset-2
        hover:text-gold-light
        hover:underline
      `,
      destructive: `
        bg-gradient-to-r from-red-600 to-red-500 text-white
        border border-red-500/30
        hover:from-red-500 hover:to-red-400
        hover:shadow-[0_10px_40px_rgba(239,68,68,0.4)]
        active:scale-[0.98]
      `,
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm gap-1.5',
      md: 'px-6 py-3 text-base gap-2',
      lg: 'px-8 py-4 text-lg gap-2.5',
      xl: 'px-10 py-5 text-xl gap-3',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], widthStyles, className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
      </button>
    );
  }
);

Button.displayName = 'Button';