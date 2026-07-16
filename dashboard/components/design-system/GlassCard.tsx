'use client';

import { forwardRef, ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'subtle' | 'bordered';
  blur?: 'default' | 'strong';
  hover?: boolean;
  children: ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', blur = 'default', hover = false, children, ...props }, ref) => {
    const baseStyles = `
      relative rounded-2xl transition-all duration-500 ease-out
      backdrop-blur-[20px]
    `;

    const variantStyles = {
      default: `
        bg-white/3
        border border-white/10
        hover:bg-white/6
        hover:border-white/20
      `,
      strong: `
        bg-white/5
        border border-white/15
        hover:bg-white/8
        hover:border-white/25
      `,
      subtle: `
        bg-white/1.5
        border border-white/5
        hover:bg-white/3
        hover:border-white/10
      `,
      bordered: `
        bg-transparent
        border border-white/20
        hover:bg-white/3
        hover:border-gold/50
      `,
    };

    const blurStyles = {
      default: 'backdrop-blur-[20px]',
      strong: 'backdrop-blur-[40px]',
    };

    const hoverStyles = hover
      ? 'hover:shadow-[0_20px_60px_rgba(91,75,138,0.25)] hover:-translate-y-1 hover:scale-[1.01]'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          blurStyles[blur],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;