import React from 'react';
import type { PurchaseItem } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { ResponsiveTable, type Column } from './ResponsiveTable';
import { ShoppingBag, Tag, Filter, User } from 'lucide-react';

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
  const uniquePeriods = Array.from(new Set(purchases.map((p) => p.detail_period || 'N/A'))).filter(Boolean);

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
          <p className="text-xs text-slate-400">
            {language === 'es'
              ? 'Haz clic en cualquier orden para ver desglose, factura PDF y rastreo de envíos'
              : 'Click any order to view breakdown, PDF invoice, and shipping tracking'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Person Filter */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedPersonFilter}
              onChange={(e) => onPersonFilterChange(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">{t.personFilter}</option>
              {uniquePersons.map((name) => (
                <option key={name} value={name} className="bg-slate-900">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter (Dynamic registered order months) */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedPeriodFilter}
              onChange={(e) => onPeriodFilterChange(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">{t.periodFilter}</option>
              {uniquePeriods.map((period) => (
                <option key={period} value={period} className="bg-slate-900">
                  {period}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ResponsiveTable
        rows={filteredPurchases}
        rowKey={(p) => p.id}
        onRowClick={onSelectPurchase}
        columns={purchasesCardColumns(t)}
      />
    </div>
  );
};

function purchasesCardColumns(t: (typeof translations)['es']): Column<PurchaseItem>[] {
  return [
    {
      key: 'order',
      header: 'Order # / Item',
      emphasis: true,
      render: (item) => (
        <div className="font-medium">
          <div className="font-mono font-bold text-white">{item.order_number || item.description}</div>
          {item.description && item.description !== item.order_number && (
            <div className="text-xs text-slate-400 font-sans mt-0.5">{item.description}</div>
          )}
        </div>
      ),
    },
    { key: 'person', header: t.person, cardLabel: t.person, render: (item) => <span className="font-semibold text-indigo-300">{item.person_name}</span> },
    { key: 'item_amount', header: t.itemAmount, align: 'right', cardLabel: t.itemAmount, render: (item) => <span className="font-mono text-slate-300">${item.item_amount.toFixed(2)}</span> },
    { key: 'tax', header: t.taxAmount, align: 'right', cardLabel: t.taxAmount, render: (item) => <span className="font-mono text-slate-400">${item.tax_amount.toFixed(2)}</span> },
    { key: 'shipping', header: t.shippingCost, align: 'right', cardLabel: t.shippingCost, render: (item) => <span className="font-mono text-slate-400">${item.shipping_cost.toFixed(2)}</span> },
    { key: 'total', header: t.totalCost, align: 'right', cardLabel: t.totalCost, emphasis: true, render: (item) => <span className="font-mono font-bold text-white">${item.total_cost.toFixed(2)}</span> },
    {
      key: 'period', header: 'Period', cardLabel: 'Period',
      render: (item) => (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          <Tag className="w-3 h-3 text-slate-400" /><span>{item.detail_period || 'N/A'}</span>
        </span>
      ),
    },
  ];
};
