import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-white border-accent hover:opacity-90',
  secondary: 'bg-panel-2 text-text border-border hover:border-accent',
  ghost: 'bg-transparent text-text border-transparent hover:bg-panel-2',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50',
        variantClass[variant],
        className,
      )}
      {...rest}
    />
  );
});
