import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
};

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className }) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center rounded-full font-semibold',
          'bg-accent/10 text-accent dark:bg-accent/20',
          sizes[size],
          className
        )
      )}
    >
      {initials}
    </span>
  );
};