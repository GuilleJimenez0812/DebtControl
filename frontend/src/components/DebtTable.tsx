import React from 'react';
import type { Person } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { UserCheck, Clock, PlusCircle, CreditCard, ArrowRight } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface DebtTableProps {
  persons: Person[];
  language: Language;
  userRole?: string;
  onOpenPaymentModal: (person: Person) => void;
  onOpenPurchaseModal: () => void;
  onSelectPersonFilter: (personName: string) => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export const DebtTable: React.FC<DebtTableProps> = ({
  persons,
  language,
  userRole,
  onOpenPaymentModal,
  onOpenPurchaseModal,
  onSelectPersonFilter,
}) => {
  const t = translations[language];
  const isAdmin = userRole === 'admin';

  return (
    <div id="debt-actions" className="mb-8 rounded-2xl border border-line bg-panel p-6 dark:border-line-dark dark:bg-panel shadow-apple dark:shadow-apple-dark">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-ink dark:text-ink-dark">{t.debtsTab}</h2>
          <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">
            {language === 'es'
              ? 'Haz clic en una persona para ver sus órdenes de compra'
              : 'Click any person to view their purchase orders'}
          </p>
        </div>

        {isAdmin && (
          <Button onClick={onOpenPurchaseModal}>
            <PlusCircle className="h-4 w-4" />
            <span>{t.newPurchase}</span>
          </Button>
        )}
      </div>

      {/* Desktop: macOS table (>md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line text-xs font-semibold text-ink-tertiary uppercase tracking-wider dark:border-line-dark dark:text-ink-tertiary-dark">
              <th className="py-3 px-2">{t.person}</th>
              <th className="py-3 px-2">{t.totalOwed}</th>
              <th className="py-3 px-2">{t.paid}</th>
              <th className="py-3 px-2">{t.balance}</th>
              <th className="py-3 px-2">{t.status}</th>
              {isAdmin && <th className="py-3 px-2 text-right">{t.action}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm dark:divide-line-dark">
            {persons.map((person) => {
              const isPaid = person.status === 'Paid';
              return (
                <tr
                  key={person.id}
                  className="hover:bg-black/[0.03] transition cursor-pointer group dark:hover:bg-white/[0.04]"
                >
                  <td
                    onClick={() => onSelectPersonFilter(person.name)}
                    className="py-4 px-2 font-semibold text-ink dark:text-ink-dark"
                  >
                    <span className="flex items-center gap-2.5">
                      <Avatar name={person.name} size="sm" />
                      <span className="group-hover:text-accent transition flex items-center gap-1">
                        <span>{person.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-2 font-mono tabular-nums text-ink-secondary dark:text-ink-secondary-dark">
                    {money(person.total_owed)}
                  </td>
                  <td className="py-4 px-2 font-mono tabular-nums text-success">
                    {money(person.total_paid)}
                  </td>
                  <td className={`py-4 px-2 font-mono tabular-nums font-bold ${isPaid ? 'text-success' : 'text-warning'}`}>
                    {money(person.balance)}
                  </td>
                  <td className="py-4 px-2">
                    <Badge tone={isPaid ? 'success' : 'warning'}>
                      {isPaid ? <UserCheck className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      <span>{person.status}</span>
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="py-4 px-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPaymentModal(person);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-success transition hover:border-success/40 hover:bg-success/10 dark:border-line-dark dark:bg-panel"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{t.recordPayment}</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards (≤md, ADR-0002) */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {persons.map((person) => {
          const isPaid = person.status === 'Paid';
          return (
            <div
              key={person.id}
              onClick={() => onSelectPersonFilter(person.name)}
              className="rounded-xl border border-line bg-panel p-4 transition hover:border-accent/30 hover:shadow-apple cursor-pointer dark:border-line-dark dark:bg-panel"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={person.name} size="sm" />
                  <span className="text-sm font-semibold text-ink dark:text-ink-dark">{person.name}</span>
                </div>
                <Badge tone={isPaid ? 'success' : 'warning'}>{person.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center border-y border-line py-2.5 my-2 dark:border-line-dark">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">{t.totalOwed}</p>
                  <p className="font-mono tabular-nums text-xs font-bold text-ink dark:text-ink-dark">{money(person.total_owed)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">{t.paid}</p>
                  <p className="font-mono tabular-nums text-xs font-bold text-success">{money(person.total_paid)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">{t.balance}</p>
                  <p className={`font-mono tabular-nums text-xs font-bold ${isPaid ? 'text-success' : 'text-warning'}`}>{money(person.balance)}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPaymentModal(person);
                    }}
                    className="flex-1"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{t.recordPayment}</span>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onSelectPersonFilter(person.name)} className="flex-1">
                    {language === 'es' ? 'Ver Compras' : 'View Purchases'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};