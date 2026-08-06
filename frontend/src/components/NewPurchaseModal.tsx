import React, { useState, useEffect } from 'react';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import type { Person } from '../types';
import type { ParseInvoiceResult } from '../services/api';
import { X, PlusCircle, UploadCloud, FileCheck2, Loader2 } from 'lucide-react';

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
  onUploadInvoice?: (file: File) => Promise<ParseInvoiceResult>;
  onSubmit: (payload: {
    person_name: string;
    order_number: string;
    description: string;
    item_amount: number;
    tax_amount: number;
    shipping_cost: number;
    detail_period: string;
    invoice_url?: string;
  }) => Promise<void>;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  language,
  persons = [],
  onClose,
  onUploadInvoice,
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
  const [attachedInvoiceUrl, setAttachedInvoiceUrl] = useState<string>('');
  
  const [parsingPDF, setParsingPDF] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setOrderNumber('');
      setDescription('');
      setItemAmount(0);
      setTaxAmount(0);
      setShippingCost(0);
      setAttachedInvoiceUrl('');
      setPdfSuccessMessage('');
      setParsingPDF(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInvoicePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadInvoice) {
      const file = e.target.files[0];
      setParsingPDF(true);
      setPdfSuccessMessage('');
      try {
        const parsed = await onUploadInvoice(file);
        const fileBlob = URL.createObjectURL(file);
        setAttachedInvoiceUrl(fileBlob);

        // Auto-fill extracted values per user request:
        // Order number: extracted order number
        // Amount: extracted total cost
        // Tax: extracted tax amount
        // Description: extracted product description if available
        // Shipping cost remains untouched for manual entry!
        if (parsed.order_number) {
          setOrderNumber(parsed.order_number);
        }
        if (parsed.total_cost > 0) {
          setItemAmount(parsed.total_cost);
        } else if (parsed.item_amount > 0) {
          setItemAmount(parsed.item_amount);
        }
        if (parsed.tax_amount >= 0) {
          setTaxAmount(parsed.tax_amount);
        }
        if (parsed.description && !parsed.description.includes('/Filter')) {
          setDescription(parsed.description);
        }

        setPdfSuccessMessage(
          language === 'es'
            ? `¡Factura analizada! Se completó la Orden #${parsed.order_number || ''}, Monto: $${parsed.total_cost.toFixed(2)} e Impuesto: $${parsed.tax_amount.toFixed(2)}.`
            : `Invoice parsed! Filled Order #${parsed.order_number || ''}, Amount: $${parsed.total_cost.toFixed(2)} and Tax: $${parsed.tax_amount.toFixed(2)}.`
        );
      } catch {
        alert(language === 'es' ? 'Error al procesar el PDF de la factura.' : 'Failed to parse invoice PDF.');
      } finally {
        setParsingPDF(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalDesc = description.trim() !== '' ? description : `Orden ${orderNumber}`;
      await onSubmit({
        person_name: personName,
        order_number: orderNumber,
        description: finalDesc,
        item_amount: Number(itemAmount),
        tax_amount: Number(taxAmount),
        shipping_cost: Number(shippingCost),
        detail_period: detailPeriod,
        invoice_url: attachedInvoiceUrl,
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
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
          <PlusCircle className="w-5 h-5 text-indigo-400" />
          <span>{t.recordNewPurchase}</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">{t.recordPurchaseDesc}</p>

        {/* Optional PDF Invoice Upload Zone */}
        {onUploadInvoice && (
          <div className="mb-5 p-4 rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-950/20 text-center relative cursor-pointer hover:border-indigo-500 transition">
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleInvoicePDFUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {parsingPDF ? (
              <div className="flex items-center justify-center space-x-2 text-indigo-400 text-xs font-semibold py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === 'es' ? 'Extrayendo orden, monto e impuesto...' : 'Extracting order, amount, and tax...'}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <UploadCloud className="w-7 h-7 text-indigo-400 mx-auto" />
                <p className="text-xs font-bold text-indigo-200">{t.uploadInvoiceOptional}</p>
                <p className="text-[11px] text-slate-400">
                  {language === 'es' ? 'Auto-detecta Orden, Monto Total e Impuesto (Envío queda manual)' : 'Auto-detects Order, Total Amount, and Tax (Shipping stays manual)'}
                </p>
              </div>
            )}
          </div>
        )}

        {pdfSuccessMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
        )}

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
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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

          {/* ORDER NUMBER (PRIMARY & REQUIRED) */}
          <div>
            <label className="block text-xs font-bold text-indigo-300 mb-1 flex items-center space-x-1">
              <span>{t.orderNumber}</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. 112-1587329-1532246"
              className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl p-2.5 text-sm text-white font-mono font-semibold focus:outline-none focus:border-indigo-400 shadow-sm"
            />
          </div>

          {/* ITEM DESCRIPTION (OPTIONAL) */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">{t.itemDescriptionOptional}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'es' ? 'ej. Zapatos, Chaqueta o detalles (Opcional)' : 'e.g. Shoes, Jacket or details (Optional)'}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/25"
            >
              {loading ? t.saving : t.savePurchase}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
