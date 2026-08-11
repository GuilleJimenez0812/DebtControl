import React from 'react';
import type { ShippingPackage } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Truck, CheckCircle2, AlertCircle, Plane, PackageOpen } from 'lucide-react';
import { Badge } from './ui/Badge';

interface ShippingPackagesProps {
  packages: ShippingPackage[];
  language: Language;
}

const money = (n: number) => `$${n.toFixed(2)}`;

const statusBadge = (
  pkg: ShippingPackage,
  t: Record<string, string>,
  lang: Language
): React.ReactNode => {
  if (pkg.personally_received) {
    return (
      <Badge tone="success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>{lang === 'es' ? 'Personal' : 'Personally'} · {t.received}</span>
      </Badge>
    );
  }
  if (pkg.warehouse_received) {
    return (
      <Badge tone="success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>{t.received}</span>
      </Badge>
    );
  }
  return (
    <Badge tone="neutral">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>{t.inTransit}</span>
    </Badge>
  );
};

export const ShippingPackages: React.FC<ShippingPackagesProps> = ({ packages, language }) => {
  const t = translations[language];

  if (packages.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border border-line bg-panel p-6 shadow-apple dark:border-line-dark dark:bg-panel dark:shadow-apple-dark">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink dark:text-ink-dark">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/10 text-accent dark:bg-accent/20">
              <Truck className="h-5 w-5" />
            </span>
            <span>{t.saveShippingLabel}</span>
          </h2>
          <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.saveShippingDesc}</p>
        </div>
        <Badge tone="accent" className="hidden sm:inline-flex">
          <PackageOpen className="h-3.5 w-3.5" />
          <span>{packages.length}</span>
        </Badge>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line text-xs font-semibold text-ink-tertiary uppercase tracking-wider dark:border-line-dark dark:text-ink-tertiary-dark">
              <th className="py-3 px-2">{t.orderNumberCol}</th>
              <th className="py-3 px-2">{t.trackingIdCol}</th>
              <th className="py-3 px-2">{t.itemDescriptionCol}</th>
              <th className="py-3 px-2">{t.shippingCostCol}</th>
              <th className="py-3 px-2">{t.warehouseStatusCol}</th>
              <th className="py-3 px-2">{t.dispatchFlightCol}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm dark:divide-line-dark">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-black/[0.03] transition dark:hover:bg-white/[0.04]">
                <td className="py-3.5 px-2 font-mono text-xs text-ink-secondary dark:text-ink-secondary-dark">{pkg.order_number}</td>
                <td className="py-3.5 px-2 font-mono text-xs font-semibold text-accent">{pkg.tracking_number || 'N/A'}</td>
                <td className="py-3.5 px-2 font-medium text-ink dark:text-ink-dark">{pkg.item_description}</td>
                <td className="py-3.5 px-2 font-mono tabular-nums text-ink-secondary dark:text-ink-secondary-dark">{money(pkg.shipping_cost)}</td>
                <td className="py-3.5 px-2">{statusBadge(pkg, t, language)}</td>
                <td className="py-3.5 px-2">
                  {pkg.dispatch_date ? (
                    <Badge tone="accent">
                      <Plane className="h-3.5 w-3.5" />
                      <span>{pkg.dispatch_date}</span>
                    </Badge>
                  ) : (
                    <span className="text-xs text-ink-muted dark:text-ink-muted-dark">{t.pending}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {packages.map((pkg) => (
          <div key={pkg.id} className="rounded-xl border border-line bg-panel p-4 dark:border-line-dark dark:bg-panel">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-accent">{pkg.tracking_number || 'N/A'}</span>
              {statusBadge(pkg, t, language)}
            </div>
            <p className="text-sm font-semibold text-ink dark:text-ink-dark">{pkg.item_description}</p>
            <p className="text-xs text-ink-tertiary mt-0.5 font-mono dark:text-ink-tertiary-dark">{pkg.order_number}</p>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2 dark:border-line-dark">
              <span className="text-[11px] text-ink-tertiary dark:text-ink-tertiary-dark">{t.shippingCostCol}</span>
              <span className="font-mono tabular-nums text-sm font-bold text-ink dark:text-ink-dark">{money(pkg.shipping_cost)}</span>
            </div>
            {pkg.dispatch_date && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-ink-tertiary dark:text-ink-tertiary-dark">{t.dispatchFlightCol}</span>
                <span className="text-xs font-semibold text-accent">{pkg.dispatch_date}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};