import React, { useState, useEffect, useRef } from 'react';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import type { Person } from '../types';
import type { ParseInvoiceResult } from '../services/api';
import { UploadCloud, FileCheck2, Loader2, PlusCircle, ArrowRight } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { useToast } from './ui/Toast';

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
  onAfterSave?: (personName: string) => void;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  language,
  persons = [],
  onClose,
  onUploadInvoice,
  onSubmit,
  onAfterSave,
}) => {
  const t = translations[language];
  const monthOptions = generateMonthPeriodOptions();
  const { toast } = useToast();

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
  const [dragging, setDragging] = useState<boolean>(false);
  const [savedPerson, setSavedPerson] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setDragging(false);
      setSavedPerson(null);
    }
  }, [isOpen]);

  const resetAfterSave = () => {
    setOrderNumber('');
    setDescription('');
    setItemAmount(0);
    setTaxAmount(0);
    setShippingCost(0);
    setAttachedInvoiceUrl('');
    setPdfSuccessMessage('');
    setLoading(false);
  };

  const processFile = async (file: File) => {
    if (!onUploadInvoice) return;
    setParsingPDF(true);
    setPdfSuccessMessage('');
    setDragging(false);
    try {
      const parsed = await onUploadInvoice(file);
      const fileBlob = URL.createObjectURL(file);
      setAttachedInvoiceUrl(fileBlob);

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
      toast('error', language === 'es' ? 'Error al procesar el PDF de la factura.' : 'Failed to parse invoice PDF.');
    } finally {
      setParsingPDF(false);
    }
  };

  const handleInvoicePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
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
      setSavedPerson(personName);
      resetAfterSave();
      toast('success', language === 'es' ? 'Compra guardada correctamente.' : 'Purchase saved successfully.');
    } catch {
      toast('error', language === 'es' ? 'Error al guardar la compra' : 'Failed to save purchase');
      setLoading(false);
    }
  };

  const personNamesList = persons.length > 0
    ? persons.map((p) => p.name)
    : ['Mama', 'Papa', 'Vale', 'Antonio/Sonia', 'Yo'];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-accent" />
          <span>{t.recordNewPurchase}</span>
        </span>
      }
      subtitle={t.recordPurchaseDesc}
      width="lg"
    >
      {savedPerson && (
        <div className="mb-5 rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="text-sm font-semibold text-ink dark:text-ink-dark">
            {language === 'es' ? `Compra guardada para ${savedPerson}.` : `Purchase saved for ${savedPerson}.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                onClose();
                onAfterSave?.(savedPerson);
              }}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>{language === 'es' ? 'Registrar pago' : 'Record payment'}</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setSavedPerson(null); onClose(); }}>
              {language === 'es' ? 'Listo' : 'Done'}
            </Button>
          </div>
        </div>
      )}

      {/* Optional PDF Invoice Upload — real dropzone */}
      {onUploadInvoice && !savedPerson && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-5 cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition ${
            dragging
              ? 'border-accent bg-accent/10'
              : 'border-accent/30 bg-accent/5 hover:border-accent/60 hover:bg-accent/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            onChange={handleInvoicePDFUpload}
            className="sr-only"
          />
          {parsingPDF ? (
            <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-accent">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{language === 'es' ? 'Extrayendo orden, monto e impuesto...' : 'Extracting order, amount, and tax...'}</span>
            </div>
          ) : (
            <div className="space-y-1">
              <UploadCloud className={`mx-auto h-7 w-7 ${dragging ? 'text-accent' : 'text-accent/80'}`} />
              <p className="text-xs font-bold text-ink dark:text-ink-dark">{t.uploadInvoiceOptional}</p>
              <p className="text-[11px] text-ink-tertiary dark:text-ink-tertiary-dark">
                {language === 'es'
                  ? 'Arrastra el PDF aquí o haz clic para seleccionarlo (Envío queda manual)'
                  : 'Drag and drop your PDF here, or click to browse (Shipping stays manual)'}
              </p>
            </div>
          )}
        </div>
      )}

      {pdfSuccessMessage && !savedPerson && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-semibold text-ink dark:text-ink-dark">
          <FileCheck2 className="h-4 w-4 shrink-0 text-success" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}

      {!savedPerson && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.personName}</label>
              <Select
                value={personName}
                onValueChange={(v) => setPersonName(v)}
                options={personNamesList.map((name) => ({ value: name, label: name }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.detailPeriod}</label>
              <Select
                value={detailPeriod}
                onValueChange={(v) => setDetailPeriod(v)}
                options={[...monthOptions.map((opt) => ({ value: opt, label: opt })), { value: 'N/A', label: 'N/A' }]}
                className="w-full"
              />
            </div>
          </div>

          {/* ORDER NUMBER (PRIMARY & REQUIRED) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
              {t.orderNumber} <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. 112-1587329-1532246"
              className="w-full font-mono font-semibold"
            />
          </div>

          {/* ITEM DESCRIPTION (OPTIONAL) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.itemDescriptionOptional}</label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'es' ? 'ej. Zapatos, Chaqueta o detalles (Opcional)' : 'e.g. Shoes, Jacket or details (Optional)'}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.itemAmount}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={itemAmount}
                onChange={(e) => setItemAmount(parseFloat(e.target.value) || 0)}
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.taxAmount}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.shippingCost}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                className="w-full font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={loading || parsingPDF} className="w-full">
              {loading ? t.saving : t.savePurchase}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};