import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-panel p-4 shadow-sm',
          className,
        )}
        {...rest}
      />
    );
  },
);
