import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-success" />,
  error: <AlertTriangle className="w-4 h-4 text-danger" />,
  info: <Info className="w-4 h-4 text-accent" />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <AnimatePresence>
        <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex flex-col gap-2">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={clsx(
                'pointer-events-auto flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-sm shadow-panel dark:shadow-panel-dark',
                'border-black/10 bg-panel text-ink dark:border-white/10 dark:bg-panel-dark dark:text-ink-dark'
              )}
            >
              {icons[t.kind]}
              <span className="max-w-xs">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="ml-1 text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </ToastContext.Provider>
  );
};