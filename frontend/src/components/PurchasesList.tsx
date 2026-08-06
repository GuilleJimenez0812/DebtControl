import React from 'react';
import type { PurchaseItem } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { ShoppingBag, Tag, Filter, User, ExternalLink } from 'lucide-react';

interface PurchasesListProps {
  purchases: PurchaseItem[];
  language: Language;
  selectedPersonFilter: string;
  onPersonFilterChange: (person: string) => void;
  selectedPeriodFilter: string;
  onPeriodFilterChange: (period: string) => void;
  onSelectPurchase: (item: PurchaseItem) => void;
}

export const PurchasesList: React.FC<PurchasesListProps> = ({
  purchases,
  language,
  selectedPersonFilter,
  onPersonFilterChange,
  selectedPeriodFilter,
  onPeriodFilterChange,
  onSelectPurchase,
}) => {
  const t = translations[language];

  const uniquePersons = Array.from(new Set(purchases.map((p) => p.person_name)));

  const filteredPurchases = purchases.filter((item) => {
    const matchesPerson = selectedPersonFilter === 'All' || item.person_name === selectedPersonFilter;
    const matchesPeriod = selectedPeriodFilter === 'All' || item.detail_period === selectedPeriodFilter;
    return matchesPerson && matchesPeriod;
  });

  return (
    <div className="glass-panel rounded-3xl p-6 mb-8 border border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            <span>{t.purchasesTab}</span>
          </h2>
          <p className="text-xs text-slate-400">Click any order to view breakdown, PDF invoice, and shipping tracking</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Person Filter */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedPersonFilter}
              onChange={(e) => onPersonFilterChange(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none"
            >
              <option value="All" className="bg-slate-900">{t.personFilter}</option>
              {uniquePersons.map((name) => (
                <option key={name} value={name} className="bg-slate-900">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              {['All', 'Julio-26', 'Agosto-26', 'N/A'].map((period) => (
                <button
                  key={period}
                  onClick={() => onPeriodFilterChange(period)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    selectedPeriodFilter === period
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">{t.person}</th>
              <th className="py-3 px-4">Order / Item</th>
              <th className="py-3 px-4">{t.itemAmount}</th>
              <th className="py-3 px-4">{t.taxAmount}</th>
              <th className="py-3 px-4">{t.shippingCost}</th>
              <th className="py-3 px-4">{t.totalCost}</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filteredPurchases.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectPurchase(item)}
                className="hover:bg-slate-800/40 transition cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-semibold text-indigo-300">
                  {item.person_name}
                </td>
                <td className="py-3.5 px-4 text-slate-200 font-medium">
                  <div className="group-hover:text-indigo-300 transition">{item.description}</div>
                  {item.order_number && (
                    <div className="text-xs text-slate-500 font-mono">{item.order_number}</div>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-300">
                  ${item.item_amount.toFixed(2)}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  ${item.tax_amount.toFixed(2)}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  ${item.shipping_cost.toFixed(2)}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-white">
                  ${item.total_cost.toFixed(2)}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{item.detail_period || 'N/A'}</span>
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 transition">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
