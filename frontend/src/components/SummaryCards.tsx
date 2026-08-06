import React from 'react';
import type { Person } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { DollarSign, Wallet, ArrowUpRight, CheckCircle2, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
  persons: Person[];
  totalOutstanding: number;
  language: Language;
  selectedPersonFilter?: string;
  onSelectPersonFilter?: (personName: string) => void;
}

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
      {/* Primary Hero Summary Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-slate-800 shadow-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <DollarSign className="w-5 h-5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {t.outstandingBalance}
              </p>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mt-3 font-mono tracking-tight">
              ${totalOutstanding.toFixed(2)}
            </h2>
          </div>

          {/* Minimalist Payment Completion Progress Bar */}
          <div className="flex items-center space-x-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 min-w-[240px]">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, paymentProgress))}%` }}
                ></div>
              </div>
              <p className="text-xs font-bold text-slate-200 font-mono">
                {paymentProgress.toFixed(0)}% {language === 'es' ? 'Completado' : 'Completed'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Person Breakdown Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-indigo-400" />
            <span>{language === 'es' ? 'Desglose por Persona' : 'Breakdown by Person'}</span>
          </h3>
          {onSelectPersonFilter && selectedPersonFilter !== 'All' && (
            <button
              onClick={() => onSelectPersonFilter('All')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
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
                className={`glass-card p-4 rounded-2xl relative transition cursor-pointer group border ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-extrabold text-indigo-300 group-hover:border-indigo-500 transition">
                      {person.name.substring(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                        {person.name}
                      </h4>
                    </div>
                  </div>

                  {isZero ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {language === 'es' ? 'Saldo Pendiente' : 'Balance Due'}
                  </span>
                  <span
                    className={`text-base font-extrabold font-mono ${
                      isZero ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    ${person.balance.toFixed(2)}
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
