import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={twMerge(
        clsx(
          'w-full h-9 rounded-[8px] border bg-transparent px-3 text-sm transition',
          'border-black/10 text-ink placeholder:text-ink-muted',
          'dark:border-white/10 dark:text-ink-dark dark:placeholder:text-ink-muted-dark',
          'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50'
        ),
        className
      )}
      {...props}
    />
  );
};