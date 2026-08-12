import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  'aria-label'?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, className, ...props }) => {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
className={twMerge(
        clsx(
          'relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          checked ? 'bg-accent' : 'bg-black/15 dark:bg-white/15',
          className
        )
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block h-[22px] w-[22px] translate-x-0.5 rounded-full bg-white shadow transform transition-transform data-[state=checked]:translate-x-[22px]" />
    </RadixSwitch.Root>
  );
};