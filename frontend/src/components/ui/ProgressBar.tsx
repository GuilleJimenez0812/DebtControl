import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ProgressBarProps {
  value: number; // 0..100
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, className }) => {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className={twMerge(clsx('h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10', className))}>
      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${width}%` }} />
    </div>
  );
};