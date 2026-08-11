import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  width = 'md',
  children,
  className,
  showClose = true,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className={twMerge(
            clsx(
              'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'w-full max-h-[90vh] overflow-y-auto',
              'rounded-[14px] border p-6 shadow-panel dark:shadow-panel-dark',
              'border-black/10 bg-panel text-ink dark:border-white/10 dark:bg-panel-dark dark:text-ink-dark',
              'focus:outline-none',
              widths[width],
              className
            )
          )}
        >
          {(title || showClose) && (
            <div className="flex items-start justify-between gap-4 mb-1">
              <div>
                {title && <Dialog.Title className="text-lg font-semibold text-ink dark:text-ink-dark">{title}</Dialog.Title>}
                {subtitle && <Dialog.Description className="mt-0.5 text-xs text-ink-muted dark:text-ink-muted-dark">{subtitle}</Dialog.Description>}
              </div>
              {showClose && (
                <Dialog.Close asChild>
                  <button className="rounded-full p-1.5 text-ink-muted hover:text-ink hover:bg-black/5 dark:text-ink-muted-dark dark:hover:text-ink-dark dark:hover:bg-white/10">
                    <X className="w-4 h-4" />
                  </button>
                </Dialog.Close>
              )}
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};