'use client';

import { forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CrystalButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'outline';
  size?: 'md' | 'lg' | 'xl';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export const CrystalButton = ({
  className,
  variant = 'default',
  size = 'lg',
  leftIcon,
  rightIcon,
  children,
  ...props
}: CrystalButtonProps) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2.5
    font-medium rounded-full transition-all duration-500 ease-out
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
  };

  const sizeStyles = {
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-10 py-4 text-lg gap-2.5',
    xl: 'px-12 py-5 text-xl gap-3',
  };

  return (
    <a
      className={`${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 group-hover:translate-x-full" aria-hidden="true" />
      <span className="relative z-10 flex items-center gap-2.5">
        {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
      </span>
    </a>
  );
};