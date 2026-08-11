import React from 'react';
import type { Person } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Wallet, ArrowUpRight, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { ProgressBar } from './ui/ProgressBar';

interface SummaryCardsProps {
  persons: Person[];
  totalOutstanding: number;
  language: Language;
  selectedPersonFilter?: string;
  onSelectPersonFilter?: (personName: string) => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  persons,
  totalOutstanding,
  language,
  selectedPersonFilter = 'All',
  onSelectPersonFilter,
}) => {
  const t = translations[language];

  const grandTotalOwed = persons.reduce((acc, p) => acc + p.total_owed, 0);
  const grandTotalPaid = persons.reduce((acc, p) => acc + p.total_paid, 0);
  const paymentProgress = grandTotalOwed > 0 ? (grandTotalPaid / grandTotalOwed) * 100 : 100;

  return (
    <div className="mb-8 space-y-6">
      {/* Primary Hero Summary Panel (macOS) */}
      <div className="mac-vibrancy mac-vibrancy-light dark:mac-vibrancy rounded-2xl border border-line dark:border-line-dark p-6 sm:p-8 shadow-apple relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 h-56 w-56 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/10 text-accent dark:bg-accent/20">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-secondary dark:text-ink-secondary-dark">
                {t.outstandingBalance}
              </p>
            </div>
            <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-ink dark:text-ink-dark font-mono tabular-nums tracking-tight">
              {money(totalOutstanding)}
            </h2>
          </div>

          {/* Minimalist Payment Completion */}
          <div className="min-w-[240px] rounded-xl border border-line dark:border-line-dark bg-panel/80 dark:bg-panel/80 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {language === 'es' ? 'Completado' : 'Completed'}
              </span>
              <span className="font-mono tabular-nums text-sm font-bold text-ink dark:text-ink-dark">
                {paymentProgress.toFixed(0)}%
              </span>
            </div>
            <ProgressBar value={paymentProgress} className="h-2" />
            <p className="mt-2 text-[11px] text-ink-tertiary dark:text-ink-tertiary-dark font-mono tabular-nums">
              {money(grandTotalPaid)} / {money(grandTotalOwed)}
            </p>
          </div>
        </div>
      </div>

      {/* Person Breakdown Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-ink-dark">
            <Wallet className="h-4 w-4 text-accent" />
            <span>{language === 'es' ? 'Desglose por Persona' : 'Breakdown by Person'}</span>
          </h3>
          {onSelectPersonFilter && selectedPersonFilter !== 'All' && (
            <button
              onClick={() => onSelectPersonFilter('All')}
              className="text-xs font-semibold text-accent hover:text-accent-hover dark:hover:text-accent-hover"
            >
              {language === 'es' ? 'Ver Todas' : 'Show All'}
            </button>
          )}
        </div>

        {/* Responsive Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {persons.map((person) => {
            const isZero = person.balance <= 0;
            const isSelected = selectedPersonFilter === person.name;

            return (
              <div
                key={person.id}
                onClick={() => onSelectPersonFilter && onSelectPersonFilter(person.name)}
                className={`rounded-xl border transition cursor-pointer group p-4 ${
                  isSelected
                    ? 'border-accent/50 bg-accent/10 dark:bg-accent/15 shadow-apple'
                    : 'border-line bg-panel hover:border-accent/30 hover:shadow-apple dark:border-line-dark dark:bg-panel'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={person.name} size="md" />
                    <div>
                      <h4 className="text-sm font-semibold text-ink dark:text-ink-dark line-clamp-1">
                        {person.name}
                      </h4>
                      <Badge tone={isZero ? 'success' : 'warning'} className="mt-0.5">
                        {isZero ? (language === 'es' ? 'Al día' : 'Paid') : (language === 'es' ? 'Pendiente' : 'Pending')}
                      </Badge>
                    </div>
                  </div>

                  {isZero ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-tertiary group-hover:text-accent transition" />
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line pt-2.5 mt-2 dark:border-line-dark">
                  <span className="text-[11px] text-ink-tertiary dark:text-ink-tertiary-dark font-medium">
                    {language === 'es' ? 'Saldo Pendiente' : 'Balance Due'}
                  </span>
                  <span className={`font-mono tabular-nums text-base font-bold ${isZero ? 'text-success' : 'text-warning'}`}>
                    {money(person.balance)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};