import React from 'react';
import type { PurchaseItem, ShippingPackage } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { ShoppingBag, Tag, ArrowRight, FileText, Truck } from 'lucide-react';
import { Select, type SelectOption } from './ui/Select';
import { Badge } from './ui/Badge';

interface PurchasesListProps {
  purchases: PurchaseItem[];
  packages: ShippingPackage[];
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
  packages,
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

      {filteredPurchases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-tertiary dark:border-line-dark dark:text-ink-tertiary-dark">
          {t.noResultsFound}
        </p>
      ) : (
        <>
          {/* Desktop: macOS table (>md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-xs font-semibold text-ink-tertiary uppercase tracking-wider dark:border-line-dark dark:text-ink-tertiary-dark">
                  <th className="py-3 px-2">{t.person}</th>
                  <th className="py-3 px-2">{language === 'es' ? 'Orden / Artículo' : 'Order / Item'}</th>
                  <th className="py-3 px-2">{language === 'es' ? 'Alertas' : 'Alerts'}</th>
                  <th className="py-3 px-2">{t.itemAmount}</th>
                  <th className="py-3 px-2">{t.taxAmount}</th>
                  <th className="py-3 px-2">{t.shippingCost}</th>
                  <th className="py-3 px-2">{t.totalCost}</th>
                  <th className="py-3 px-2">{language === 'es' ? 'Período' : 'Period'}</th>
                  <th className="py-3 px-2 text-right">{language === 'es' ? 'Detalle' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm dark:divide-line-dark">
                {filteredPurchases.map((item) => {
                  const hasInvoice = !!item.invoice_url;
                  const hasTracking = packages.some(pkg => pkg.purchase_item_id === item.id && pkg.tracking_number);
                  return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPurchase(item)}
                    className="hover:bg-black/[0.03] transition cursor-pointer group dark:hover:bg-white/[0.04]"
                  >
                    <td className="py-3.5 px-2 font-medium text-ink dark:text-ink-dark">{item.person_name}</td>
                    <td className="py-3.5 px-2">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-ink-secondary dark:text-ink-secondary-dark">{item.order_number || item.description}</span>
                        {item.description && item.description !== item.order_number && (
                          <span className="text-sm text-ink font-semibold dark:text-ink-dark truncate max-w-[200px]" title={item.description}>
                            {item.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-1.5">
                        {!hasInvoice && (
                          <div title={language === 'es' ? 'Factura no cargada' : 'Missing Invoice'} className="text-warning dark:text-warning-dark">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        {!hasTracking && (
                          <div title={language === 'es' ? 'Tracking no cargado' : 'Missing Tracking'} className="text-error dark:text-error-dark">
                            <Truck className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-2 font-mono tabular-nums text-ink-secondary dark:text-ink-secondary-dark">{money(item.item_amount)}</td>
                    <td className="py-3.5 px-2 font-mono tabular-nums text-ink-tertiary dark:text-ink-tertiary-dark">-{money(item.tax_amount)}</td>
                    <td className="py-3.5 px-2 font-mono tabular-nums text-ink-tertiary dark:text-ink-tertiary-dark">{money(item.shipping_cost)}</td>
                    <td className="py-3.5 px-2 font-mono tabular-nums font-bold text-ink dark:text-ink-dark">{money(item.total_cost)}</td>
                    <td className="py-3.5 px-2">
                      <Badge tone="neutral">
                        <Tag className="h-3 w-3" />
                        <span>{item.detail_period || 'N/A'}</span>
                      </Badge>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-accent/10 text-accent transition group-hover:bg-accent/20">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards (≤md, ADR-0002) */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filteredPurchases.map((item) => {
              const hasInvoice = !!item.invoice_url;
              const hasTracking = packages.some(pkg => pkg.purchase_item_id === item.id && pkg.tracking_number);
              return (
              <div
                key={item.id}
                onClick={() => onSelectPurchase(item)}
                className="cursor-pointer rounded-xl border border-line bg-panel p-4 transition hover:border-accent/30 hover:shadow-apple dark:border-line-dark dark:bg-panel"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-ink dark:text-ink-dark truncate">
                    {item.order_number || item.description}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {!hasInvoice && (
                        <FileText className="w-4 h-4 text-warning dark:text-warning-dark" />
                      )}
                      {!hasTracking && (
                        <Truck className="w-4 h-4 text-error dark:text-error-dark" />
                      )}
                    </div>
                    <span className="shrink-0 rounded-[6px] bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      {item.person_name}
                    </span>
                  </div>
                </div>
                {item.description && item.description !== item.order_number && (
                  <p className="text-xs text-ink-tertiary mb-2 dark:text-ink-tertiary-dark">{item.description}</p>
                )}
                <div className="grid grid-cols-4 gap-2 text-center rounded-xl bg-black/[0.03] py-2 dark:bg-white/[0.04]">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">Item</p>
                    <p className="font-mono tabular-nums text-xs font-bold text-ink dark:text-ink-dark">{money(item.item_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">Tax</p>
                    <p className="font-mono tabular-nums text-xs text-ink-secondary dark:text-ink-secondary-dark">-{money(item.tax_amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">Ship</p>
                    <p className="font-mono tabular-nums text-xs text-ink-secondary dark:text-ink-secondary-dark">{money(item.shipping_cost)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">Total</p>
                    <p className="font-mono tabular-nums text-xs font-bold text-ink dark:text-ink-dark">{money(item.total_cost)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge tone="neutral">
                    <Tag className="h-3 w-3" />
                    <span>{item.detail_period || 'N/A'}</span>
                  </Badge>
                  <span className="text-[11px] font-semibold text-accent">{language === 'es' ? 'Ver detalle' : 'View details'}</span>
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
};