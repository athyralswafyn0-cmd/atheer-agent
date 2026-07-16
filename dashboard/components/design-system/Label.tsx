'use client';

import { forwardRef, LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-sm font-medium text-ink/80 mb-2', className)}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';