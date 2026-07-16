'use client';

import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', leftIcon, rightIcon, loading, disabled, asChild = false, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-body font-medium rounded-xl
      transition-all duration-300 ease-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-space
      disabled:opacity-40 disabled:pointer-events-none
      select-none
    `;

    const variantStyles = {
      default: `
        bg-white/50 text-charcoal
        border border-white/70
        shadow-[0_20px_60px_rgba(91,75,138,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]
        hover:shadow-[0_28px_80px_rgba(91,75,138,0.26)]
        hover:-translate-y-1 hover:scale-103
        hover:bg-white/60
        active:scale-98
      `,
      outline: `
        bg-transparent text-gold
        border-2 border-gold/50
        hover:bg-gold/10
        hover:border-gold
        hover:text-space
        hover:shadow-[0_20px_60px_rgba(212,168,67,0.3)]
      `,
      secondary: `
        bg-white/5 text-ink
        border border-white/10
        hover:bg-white/10
        hover:border-white/20
        hover:shadow-[0_20px_60px_rgba(91,75,138,0.2)]
      `,
      ghost: `
        bg-transparent text-ink
        hover:bg-white/5
        hover:text-ink
      `,
      link: `
        bg-transparent text-gold underline-offset-2
        hover:text-gold-light
        active:text-gold/70
      `,
      destructive: `
        bg-red-500/20 text-red-300
        border border-red-500/30
        hover:bg-red-500/30
        hover:border-red-500/50
        hover:shadow-[0_20px_60px_rgba(239,68,68,0.3)]
      `,
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm gap-1.5',
      md: 'px-6 py-3 text-base gap-2',
      lg: 'px-8 py-4 text-lg gap-2.5',
      xl: 'px-10 py-5 text-xl gap-3',
    };

    const shimmer = `
      absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full
    `;

    const Component = asChild ? 'span' : 'button';

    return (
      <Component
        ref={ref}
        className={cn('group', baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        <span className={shimmer} aria-hidden="true" />
        <span className="relative z-10 flex items-center gap-2">
          {loading && (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </span>
      </Component>
    );
  }
);

Button.displayName = 'Button';

// Anchor version for links
interface AnchorButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const AnchorButton = forwardRef<HTMLAnchorElement, AnchorButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-2xl transition-all duration-500 ease-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-space
      backdrop-blur-[18px]
      relative overflow-hidden
    `;

    const variantStyles = {
      default: `
        bg-white/50 text-charcoal
        border border-white/70
        shadow-[0_20px_60px_rgba(91,75,138,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]
        hover:shadow-[0_28px_80px_rgba(91,75,138,0.26)]
        hover:-translate-y-1 hover:scale-103
        hover:bg-white/60
      `,
      outline: `
        bg-transparent text-gold
        border-2 border-gold/50
        hover:bg-gold/10
        hover:border-gold
        hover:text-space
        hover:shadow-[0_20px_60px_rgba(212,168,67,0.3)]
      `,
      secondary: `
        bg-white/5 text-ink
        border border-white/10
        hover:bg-white/10
        hover:border-white/20
        hover:shadow-[0_20px_60px_rgba(91,75,138,0.2)]
      `,
      ghost: `
        bg-transparent text-ink
        hover:bg-white/5
      `,
      link: `
        bg-transparent text-gold underline-offset-2
        hover:text-gold-light
        active:text-gold/70
      `,
      destructive: `
        bg-red-500/20 text-red-300
        border border-red-500/30
        hover:bg-red-500/30
        hover:border-red-500/50
        hover:shadow-[0_20px_60px_rgba(239,68,68,0.3)]
      `,
    };

    const sizeStyles = {
      sm: 'px-4 py-2 text-sm gap-1.5',
      md: 'px-6 py-3 text-base gap-2',
      lg: 'px-8 py-4 text-lg gap-2.5',
      xl: 'px-10 py-5 text-xl gap-3',
    };

    const shimmer = `
      absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full
    `;

    return (
      <a
        ref={ref}
        className={cn(
          'group',
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        <span className={shimmer} aria-hidden="true" />
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </a>
    );
  }
);

AnchorButton.displayName = 'AnchorButton';