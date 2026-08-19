import React, { useState, useRef } from 'react';
import type { Person, PurchaseItem } from '../types';
import type { ParseInvoiceResult } from '../services/api';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { generateMonthPeriodOptions } from './NewPurchaseModal';
import { UploadCloud, CheckCircle2, AlertCircle, User, Tag, FileText, Layers, Eye } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { useToast } from './ui/Toast';

interface UploadInvoiceModalProps {
  isOpen: boolean;
  persons: Person[];
  language: Language;
  onClose: () => void;
  onUpload: (file: File) => Promise<ParseInvoiceResult>;
  onConfirmAttach: (purchaseId: string, invoiceFilename: string, mode: 'replace' | 'append') => Promise<void>;
  onOpenPreviewInvoice?: (url: string) => void;
  onCreatePurchase: (payload: {
    person_name: string;
    order_number: string;
    description: string;
    item_amount: number;
    tax_amount: number;
    shipping_cost: number;
    invoice_url: string;
    detail_period: string;
  }) => Promise<void>;
}

export const UploadInvoiceModal: React.FC<UploadInvoiceModalProps> = ({
  isOpen,
  persons,
  language,
  onClose,
  onUpload,
  onConfirmAttach,
  onOpenPreviewInvoice,
  onCreatePurchase,
}) => {
  const t = translations[language];
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ParseInvoiceResult | null>(null);
  const [attachMode, setAttachMode] = useState<'replace' | 'append'>('replace');
  const [selectedPerson, setSelectedPerson] = useState<string>(persons[0]?.name || '');
  const [detailPeriod, setDetailPeriod] = useState<string>('Julio-26');
  const [error, setError] = useState<string>('');
  const [dragging, setDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setFileBlobUrl(null);
      setResult(null);
      setError('');
      setLoading(false);
      setAttachMode('replace');
      setDragging(false);
    }
  }, [isOpen]);

  const pickFile = (selected: File) => {
    setFile(selected);
    setFileBlobUrl(URL.createObjectURL(selected));
    setError('');
    setResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      pickFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    try {
      const res = await onUpload(file);
      setResult(res);
    } catch {
      toast('error', language === 'es' ? 'Error al analizar el PDF de la factura.' : 'Failed to parse invoice PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMatch = async (item: PurchaseItem) => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const targetUrl = result?.saved_filename || fileBlobUrl || file.name;
      await onConfirmAttach(item.id, targetUrl, attachMode);
      toast('success', t.invoiceAttached);
      onClose();
    } catch {
      toast('error', language === 'es' ? 'Error al vincular la factura.' : 'Failed to attach invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnmatchedPurchase = async () => {
    if (!result || !selectedPerson || !file) return;
    setLoading(true);
    try {
      const targetUrl = result.saved_filename || fileBlobUrl || file.name;
      await onCreatePurchase({
        person_name: selectedPerson,
        order_number: result.order_number,
        description: result.description,
        item_amount: result.item_amount,
        tax_amount: result.tax_amount,
        shipping_cost: result.shipping_cost,
        invoice_url: targetUrl,
        detail_period: detailPeriod,
      });
      toast('success', t.invoiceCreated);
      onClose();
    } catch {
      toast('error', language === 'es' ? 'Error al crear la orden de compra.' : 'Failed to create purchase order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      width="lg"
      title={
        <span className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-accent" />
          <span>{t.attachInvoiceTitle}</span>
        </span>
      }
      subtitle={t.attachInvoiceDesc}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">{error}</div>
      )}

      {!result ? (
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) pickFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragging ? 'border-accent bg-accent/10' : 'border-accent/30 bg-accent/5 hover:border-accent/60 hover:bg-accent/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
            <UploadCloud className="mx-auto mb-3 h-10 w-10 text-accent" />
            <p className="text-sm font-semibold text-ink dark:text-ink-dark">
              {file ? file.name : t.dragSelectInvoice}
            </p>
            <p className="mt-1 text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.amazonReceiptsHint}</p>
          </div>

          {fileBlobUrl && onOpenPreviewInvoice && (
            <Button type="button" variant="secondary" className="w-full" onClick={() => onOpenPreviewInvoice(fileBlobUrl)}>
              <Eye className="h-4 w-4 text-accent" />
              <span>{t.previewSelectedPdf}</span>
            </Button>
          )}

          <Button type="submit" isLoading={loading} disabled={!file || loading} className="w-full">
            {loading ? t.analyzingInvoice : t.matchInvoice}
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          {result.matched && result.matched_purchase_item ? (
            <div className="space-y-5 rounded-2xl border border-success/30 bg-success/5 p-5">
              <div className="flex items-center justify-between border-b border-success/20 pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-success/15 text-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-ink dark:text-ink-dark">{t.matchingOrderFound}</h4>
                    <p className="text-xs text-success">{t.verifyOrderDetails}</p>
                  </div>
                </div>

                {fileBlobUrl && onOpenPreviewInvoice && (
                  <Button size="sm" variant="secondary" type="button" onClick={() => onOpenPreviewInvoice(fileBlobUrl)}>
                    <Eye className="h-3.5 w-3.5 text-accent" />
                    <span>{t.viewPdf}</span>
                  </Button>
                )}
              </div>

              <div className="space-y-2.5 rounded-xl border border-line bg-black/[0.02] p-4 text-xs dark:border-line-dark dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-ink-tertiary dark:text-ink-tertiary-dark">
                    <User className="h-3.5 w-3.5 text-accent" />
                    <span>{t.personColon}</span>
                  </span>
                  <span className="font-bold text-ink dark:text-ink-dark">{result.matched_purchase_item.person_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-ink-tertiary dark:text-ink-tertiary-dark">
                    <Tag className="h-3.5 w-3.5 text-accent" />
                    <span>{t.orderNumberColon}</span>
                  </span>
                  <span className="font-mono text-ink dark:text-ink-dark font-semibold">{result.matched_purchase_item.order_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-tertiary dark:text-ink-tertiary-dark">{t.descriptionColon}</span>
                  <span className="max-w-[220px] truncate font-medium text-ink dark:text-ink-dark">{result.matched_purchase_item.description}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2 dark:border-line-dark">
                  <span className="text-ink-tertiary dark:text-ink-tertiary-dark">{t.currentTotal}</span>
                  <span className="font-mono text-sm font-extrabold text-ink dark:text-ink-dark">${result.matched_purchase_item.total_cost.toFixed(2)}</span>
                </div>
              </div>

              {result.matched_purchase_item.invoice_url ? (
                <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-warning">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t.alreadyAttachedInvoice}</span>
                    </div>
                    {onOpenPreviewInvoice && (
                      <button
                        type="button"
                        onClick={() => onOpenPreviewInvoice(result.matched_purchase_item?.invoice_url || '')}
                        className="flex items-center gap-1 text-xs font-bold text-warning hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{t.preview}</span>
                      </button>
                    )}
                  </div>
                  <p className="truncate rounded-lg bg-black/[0.03] p-2 font-mono text-xs text-ink-secondary dark:bg-white/[0.03] dark:text-ink-secondary-dark" title={result.matched_purchase_item.invoice_url}>
                    {result.matched_purchase_item.invoice_url.startsWith('blob:')
                      ? `Factura_${result.matched_purchase_item.order_number || 'Pedido'}.pdf`
                      : result.matched_purchase_item.invoice_url.split('/').pop()}
                  </p>

                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold text-ink-secondary dark:text-ink-secondary-dark">{t.handleNewInvoice}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={attachMode === 'replace' ? 'primary' : 'secondary'}
                        onClick={() => setAttachMode('replace')}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{t.replaceExisting}</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={attachMode === 'append' ? 'primary' : 'secondary'}
                        onClick={() => setAttachMode('append')}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>{t.addAsAdditional}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button variant="ghost" className="w-1/3" onClick={() => setResult(null)}>
                  {t.cancel}
                </Button>
                <Button variant="success" className="w-2/3" onClick={() => handleAcceptMatch(result.matched_purchase_item!)} isLoading={loading}>
                  <span>{loading ? t.attaching : t.acceptAttachInvoice}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-warning/30 bg-warning/5 p-5">
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-5 w-5" />
                <h4 className="text-sm font-bold text-ink dark:text-ink-dark">{t.noMatchingOrder}</h4>
              </div>

              <div className="rounded-xl border border-line bg-black/[0.02] p-3 font-mono text-xs dark:border-line-dark dark:bg-white/[0.02]">
                <p><span className="text-ink-tertiary dark:text-ink-tertiary-dark">{t.orderNumberColon}</span> <span className="text-ink dark:text-ink-dark font-semibold">{result.order_number || 'N/A'}</span></p>
                <p><span className="text-ink-tertiary dark:text-ink-tertiary-dark">{t.amountInInvoice}</span> <span className="font-semibold text-ink dark:text-ink-dark">${result.total_cost.toFixed(2)}</span></p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.assignToPerson}</label>
                <Select
                  value={selectedPerson}
                  onValueChange={setSelectedPerson}
                  options={persons.map((p) => ({ value: p.name, label: p.name }))}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.detailPeriod}</label>
                <Select
                  value={detailPeriod}
                  onValueChange={setDetailPeriod}
                  options={[...generateMonthPeriodOptions().map((opt) => ({ value: opt, label: opt })), { value: 'N/A', label: 'N/A' }]}
                  className="w-full"
                />
              </div>

              <Button onClick={handleCreateUnmatchedPurchase} isLoading={loading} className="w-full">
                <span>{loading ? t.creatingOrder : t.createNewOrderWithInvoice}</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};