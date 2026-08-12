import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<Tone, string> = {
  default: 'bg-accent/10 text-accent border-accent/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  neutral: 'bg-black/5 text-ink-muted border-black/10 dark:bg-white/10 dark:text-ink-muted-dark dark:border-white/10',
};

interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'default', className, children }) => {
  return (
    <span
      className={twMerge(
        clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone], className)
      )}
    >
      {children}
    </span>
  );
};