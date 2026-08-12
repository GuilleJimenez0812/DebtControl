import React from 'react';
import { Layers, ShoppingBag, CreditCard, FileUp, Users, ShieldCheck, X, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type NavKey = 'debts' | 'purchases' | 'payments' | 'invoices';

interface SidebarProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  isAdmin: boolean;
  onOpenAdminModal: () => void;
  onOpenAuditLogsModal: () => void;
  onOpenUploadInvoiceModal: () => void;
  onCloseDrawer?: () => void;
  className?: string;
  compact?: boolean;
}

interface NavItem {
  key: NavKey;
  icon: React.ReactNode;
  label: string;
  es: string;
}

const NAV: NavItem[] = [
  { key: 'debts', icon: <Layers className="h-4 w-4" />, label: 'Debts', es: 'Deudas' },
  { key: 'purchases', icon: <ShoppingBag className="h-4 w-4" />, label: 'Purchases', es: 'Compras' },
  { key: 'payments', icon: <CreditCard className="h-4 w-4" />, label: 'Payments', es: 'Pagos' },
  { key: 'invoices', icon: <FileUp className="h-4 w-4" />, label: 'Invoices', es: 'Facturas' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  active,
  onNavigate,
  isAdmin,
  onOpenAdminModal,
  onOpenAuditLogsModal,
  onOpenUploadInvoiceModal,
  onCloseDrawer,
  className,
  compact = false,
}) => {
  const click = (fn: () => void) => {
    fn();
    onCloseDrawer?.();
  };

  const itemCls = (isActive: boolean) =>
    twMerge(
      clsx(
        'flex items-center gap-2.5 rounded-[8px] text-sm font-medium transition',
        compact ? 'px-2.5 py-2 justify-center' : 'px-3 py-2',
        isActive
          ? 'bg-accent/10 text-accent dark:bg-accent/15'
          : 'text-ink-muted hover:bg-black/5 hover:text-ink dark:text-ink-muted-dark dark:hover:bg-white/10 dark:hover:text-ink-dark'
      )
    );

  return (
    <nav className={clsx('flex h-full flex-col gap-1 p-2', className)} aria-label="Main">
      {NAV.map((item) => (
        <button key={item.key} onClick={() => click(() => onNavigate(item.key))} className={itemCls(active === item.key)} title={item.es}>
          {item.icon}
          {!compact && <span>{item.es}</span>}
        </button>
      ))}

      {isAdmin && (
        <>
          <div className="my-1.5 border-t border-line dark:border-line-dark" />
          <button onClick={() => click(onOpenAdminModal)} className={itemCls(false)} title="Admin">
            <Users className="h-4 w-4 text-accent" />
            {!compact && <span>Admin</span>}
          </button>
          <button onClick={() => click(onOpenAuditLogsModal)} className={itemCls(false)} title="Audit Logs">
            <ShieldCheck className="h-4 w-4 text-accent" />
            {!compact && <span>Audit Logs</span>}
          </button>
          <button onClick={() => click(onOpenUploadInvoiceModal)} className={itemCls(false)} title="Subir Factura">
            <FileUp className="h-4 w-4 text-warning" />
            {!compact && <span>Subir Factura</span>}
          </button>
        </>
      )}

      {onCloseDrawer && (
        <button
          onClick={onCloseDrawer}
          className="md:hidden mt-auto flex items-center justify-center gap-2 rounded-[8px] py-2 text-sm text-ink-muted hover:bg-black/5 dark:text-ink-muted-dark dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  );
};