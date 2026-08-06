import React, { useState } from 'react';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import type { Person } from '../types';
import { X, PlusCircle } from 'lucide-react';

export function generateMonthPeriodOptions(): string[] {
  const monthsEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const now = new Date();
  const options: string[] = [];

  // Generate months starting from 2 months ago up to 6 months into the future
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthName = monthsEs[d.getMonth()];
    const yearShort = d.getFullYear().toString().slice(-2);
    options.push(`${monthName}-${yearShort}`);
  }

  // Ensure standard spreadsheet months exist
  const defaults = ['Julio-26', 'Agosto-26'];
  for (const def of defaults) {
    if (!options.includes(def)) {
      options.unshift(def);
    }
  }

  return options;
}

interface NewPurchaseModalProps {
  isOpen: boolean;
  language: Language;
  persons?: Person[];
  onClose: () => void;
  onSubmit: (payload: {
    person_name: string;
    order_number: string;
    description: string;
    item_amount: number;
    tax_amount: number;
    shipping_cost: number;
    detail_period: string;
  }) => Promise<void>;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  language,
  persons = [],
  onClose,
  onSubmit,
}) => {
  const t = translations[language];
  const monthOptions = generateMonthPeriodOptions();

  const defaultPerson = persons[0]?.name || 'Yo';

  const [personName, setPersonName] = useState<string>(defaultPerson);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [itemAmount, setItemAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [detailPeriod, setDetailPeriod] = useState<string>(monthOptions[0] || 'Agosto-26');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        person_name: personName,
        order_number: orderNumber,
        description: description,
        item_amount: Number(itemAmount),
        tax_amount: Number(taxAmount),
        shipping_cost: Number(shippingCost),
        detail_period: detailPeriod,
      });
      onClose();
    } catch {
      alert(language === 'es' ? 'Error al guardar la compra' : 'Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  const personNamesList = persons.length > 0
    ? persons.map((p) => p.name)
    : ['Mama', 'Papa', 'Vale', 'Antonio/Sonia', 'Yo'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
          <PlusCircle className="w-5 h-5 text-indigo-400" />
          <span>{t.recordNewPurchase}</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">{t.recordPurchaseDesc}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.personName}</label>
              <select
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {personNamesList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.detailPeriod}</label>
              <select
                value={detailPeriod}
                onChange={(e) => setDetailPeriod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {monthOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">{t.itemDescription}</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'es' ? 'ej. Zapatos o Chaqueta' : 'e.g. Shoes or Jacket'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">{t.orderNumberOptional}</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Pedido n.º 112-1587329-1532246"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.itemAmount}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={itemAmount}
                onChange={(e) => setItemAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.taxAmount}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.shippingCost}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/20"
            >
              {loading ? t.saving : t.savePurchase}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
