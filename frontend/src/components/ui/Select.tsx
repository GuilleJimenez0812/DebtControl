import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, options, placeholder, className }) => {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
className={twMerge(
          clsx(
            'inline-flex h-9 items-center justify-between gap-2 rounded-[8px] border px-3 text-sm',
            'border-black/10 bg-transparent text-ink dark:border-white/10 dark:text-ink-dark',
            'focus:outline-none focus:ring-2 focus:ring-accent/40',
            className
          )
        )}
      >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="w-4 h-4 text-ink-muted dark:text-ink-muted-dark" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            align="center"
            sideOffset={4}
            className="z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[8px] border border-black/10 bg-panel p-1 shadow-panel dark:border-white/10 dark:bg-panel-dark dark:shadow-panel-dark"
          >
            <RadixSelect.Viewport>
              {options.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex cursor-pointer items-center justify-between rounded-[6px] px-3 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-black/5 dark:text-ink-dark dark:data-[highlighted]:bg-white/10"
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check className="w-4 h-4 text-accent" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
    </RadixSelect.Root>
  );
};