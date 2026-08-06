import React from 'react';
import type { Person } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { UserCheck, Clock, PlusCircle, CreditCard, ArrowRight } from 'lucide-react';

interface DebtTableProps {
  persons: Person[];
  language: Language;
  onOpenPaymentModal: (person: Person) => void;
  onOpenPurchaseModal: () => void;
  onSelectPersonFilter: (personName: string) => void;
}

export const DebtTable: React.FC<DebtTableProps> = ({
  persons,
  language,
  onOpenPaymentModal,
  onOpenPurchaseModal,
  onSelectPersonFilter,
}) => {
  const t = translations[language];

  return (
    <div className="glass-panel rounded-3xl p-6 mb-8 border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>{t.debtsTab}</span>
          </h2>
          <p className="text-xs text-slate-400">Click any person to view their specific purchase orders</p>
        </div>

        <button
          onClick={onOpenPurchaseModal}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.newPurchase}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">{t.person}</th>
              <th className="py-3 px-4">{t.totalOwed}</th>
              <th className="py-3 px-4">{t.paid}</th>
              <th className="py-3 px-4">{t.balance}</th>
              <th className="py-3 px-4">{t.status}</th>
              <th className="py-3 px-4 text-right">{t.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {persons.map((person) => {
              const isPaid = person.status === 'Paid';
              return (
                <tr
                  key={person.id}
                  className="hover:bg-slate-800/40 transition cursor-pointer group"
                >
                  <td
                    onClick={() => onSelectPersonFilter(person.name)}
                    className="py-4 px-4 font-semibold text-white flex items-center space-x-2"
                  >
                    <span className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 group-hover:border-indigo-500 transition">
                      {person.name.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="group-hover:text-indigo-300 transition flex items-center space-x-1">
                      <span>{person.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-200">
                    ${person.total_owed.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 font-mono text-emerald-400">
                    ${person.total_paid.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-amber-300">
                    ${person.balance.toFixed(2)}
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {isPaid ? <UserCheck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{person.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPaymentModal(person);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition inline-flex items-center space-x-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{t.recordPayment}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
