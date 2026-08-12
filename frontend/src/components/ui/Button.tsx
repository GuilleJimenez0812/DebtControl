import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium transition select-none ' +
  'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110 shadow-sm',
  secondary: 'bg-black/5 text-ink hover:bg-black/10 dark:bg-white/10 dark:text-ink-dark dark:hover:bg-white/15',
  ghost: 'text-ink-muted hover:text-ink hover:bg-black/5 dark:text-ink-muted-dark dark:hover:text-ink-dark dark:hover:bg-white/10',
  danger: 'bg-danger/10 text-danger hover:bg-danger/20',
  success: 'bg-success text-white hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export const Button: React.FC<ButtonProps> = ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }) => {
  return (
    <button 
      className={twMerge(clsx(base, variants[variant], sizes[size], className))} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};