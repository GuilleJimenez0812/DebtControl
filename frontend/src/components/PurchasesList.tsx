import React, { useState } from 'react';
import type { PurchaseItem } from '../types';
import { ShoppingBag, Tag, Filter } from 'lucide-react';

interface PurchasesListProps {
  purchases: PurchaseItem[];
}

export const PurchasesList: React.FC<PurchasesListProps> = ({ purchases }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');

  const filteredPurchases = selectedPeriod === 'All'
    ? purchases
    : purchases.filter((item) => item.detail_period === selectedPeriod);

  return (
    <div className="glass-panel rounded-2xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            <span>Purchases & Orders Log (Detalle de Compras)</span>
          </h2>
          <p className="text-xs text-slate-400">Detailed list of orders, taxes, and shipping expenses</p>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            {['All', 'Julio-26', 'Agosto-26', 'N/A'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  selectedPeriod === period
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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Person</th>
              <th className="py-3 px-4">Order / Item</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Tax</th>
              <th className="py-3 px-4">Shipping</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Period</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filteredPurchases.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3.5 px-4 font-semibold text-indigo-300">
                  {item.person_name}
                </td>
                <td className="py-3.5 px-4 text-slate-200 font-medium">
                  <div>{item.description}</div>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
