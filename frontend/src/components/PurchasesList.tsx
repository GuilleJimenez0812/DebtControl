import React from 'react';
import type { PurchaseItem } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { ShoppingBag, Tag, ArrowRight } from 'lucide-react';
import { Select, type SelectOption } from './ui/Select';
import { Badge } from './ui/Badge';

interface PurchasesListProps {
  purchases: PurchaseItem[];
  language: Language;
  selectedPersonFilter: string;
  onPersonFilterChange: (person: string) => void;
  selectedPeriodFilter: string;
  onPeriodFilterChange: (period: string) => void;
  onSelectPurchase: (item: PurchaseItem) => void;
}

const money = (n: number) => `$${n.toFixed(2)}`;

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

  const personOptions: SelectOption[] = [
    { value: 'All', label: t.personFilter },
    ...uniquePersons.map((name) => ({ value: name, label: name })),
  ];

  const periodOptions: SelectOption[] = [
    { value: 'All', label: t.periodFilter },
    ...uniquePeriods.map((period) => ({ value: period, label: period })),
  ];

  const filteredPurchases = purchases.filter((item) => {
    const matchesPerson = selectedPersonFilter === 'All' || item.person_name === selectedPersonFilter;
    const matchesPeriod = selectedPeriodFilter === 'All' || item.detail_period === selectedPeriodFilter;
    return matchesPerson && matchesPeriod;
  });

  return (
    <div className="mb-8 rounded-2xl border border-line bg-panel p-6 shadow-apple dark:border-line-dark dark:bg-panel dark:shadow-apple-dark">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink dark:text-ink-dark">
            <ShoppingBag className="h-5 w-5 text-accent" />
            <span>{t.purchasesTab}</span>
          </h2>
          <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">
            {language === 'es'
              ? 'Haz clic en cualquier orden para ver desglose, factura PDF y rastreo de envíos'
              : 'Click any order to view breakdown, PDF invoice, and shipping tracking'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPersonFilter} onValueChange={onPersonFilterChange} options={personOptions} />
          <Select value={selectedPeriodFilter} onValueChange={onPeriodFilterChange} options={periodOptions} />
        </div>
      </div>

</div>
    </div>
  );
};
