import React, { useState } from 'react';
import type { Person, PurchaseItem } from '../types';
import type { ParseInvoiceResult } from '../services/api';
import type { Language } from '../i18n/translations';
import { X, UploadCloud, AlertCircle, PlusCircle, CheckCircle2, User, Tag, FileText, Layers, Eye } from 'lucide-react';

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
  const [file, setFile] = useState<File | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ParseInvoiceResult | null>(null);
  const [attachMode, setAttachMode] = useState<'replace' | 'append'>('replace');
  const [selectedPerson, setSelectedPerson] = useState<string>(persons[0]?.name || '');
  const [detailPeriod, setDetailPeriod] = useState<string>('Julio-26');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setFileBlobUrl(URL.createObjectURL(selected));
      setError('');
      setResult(null);
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
      setError(language === 'es' ? 'Error al analizar el PDF de la factura.' : 'Failed to parse invoice PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMatch = async (item: PurchaseItem) => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const targetUrl = fileBlobUrl || file.name;
      await onConfirmAttach(item.id, targetUrl, attachMode);
      onClose();
    } catch {
      setError(language === 'es' ? 'Error al vincular la factura.' : 'Failed to attach invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnmatchedPurchase = async () => {
    if (!result || !selectedPerson) return;
    setLoading(true);
    try {
      await onCreatePurchase({
        person_name: selectedPerson,
        order_number: result.order_number,
        description: result.description,
        item_amount: result.item_amount,
        tax_amount: result.tax_amount,
        shipping_cost: result.shipping_cost,
        detail_period: detailPeriod,
      });
      onClose();
    } catch {
      setError(language === 'es' ? 'Error al crear la orden de compra.' : 'Failed to create purchase order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-xl p-6 rounded-3xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {language === 'es' ? 'Vincular Factura PDF a Pedido' : 'Attach PDF Invoice to Order'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'es'
                ? 'Localiza el pedido en el sistema por su número de orden y adjunta la factura PDF'
                : 'Locates system order by order number and attaches the PDF invoice document'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {!result ? (
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl p-8 text-center bg-slate-900/50 transition cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-bounce" />
              <p className="text-sm font-semibold text-white">
                {file ? file.name : language === 'es' ? 'Arrastra o selecciona el archivo PDF de la factura' : 'Drag or select your invoice PDF file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Amazon receipts, PDF invoices</p>
            </div>

            {fileBlobUrl && onOpenPreviewInvoice && (
              <button
                type="button"
                onClick={() => onOpenPreviewInvoice(fileBlobUrl)}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-indigo-300 font-bold text-xs flex items-center justify-center space-x-2 transition"
              >
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>{language === 'es' ? 'Previsualizar PDF Seleccionado' : 'Preview Selected PDF'}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? (language === 'es' ? 'Analizando Factura...' : 'Parsing Invoice...') : (language === 'es' ? 'Buscar & Coincidir Factura' : 'Match Invoice')}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {result.matched && result.matched_purchase_item ? (
              <div className="glass-card p-6 rounded-2xl border-emerald-500/40 bg-emerald-950/10 space-y-5">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {language === 'es' ? '¡Pedido Encontrado en el Sistema!' : 'Matching Order Found!'}
                      </h4>
                      <p className="text-xs text-emerald-300">
                        {language === 'es' ? 'Verifica los detalles del pedido antes de confirmar la vinculación' : 'Verify order details before confirming attachment'}
                      </p>
                    </div>
                  </div>

                  {fileBlobUrl && onOpenPreviewInvoice && (
                    <button
                      type="button"
                      onClick={() => onOpenPreviewInvoice(fileBlobUrl)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'es' ? 'Ver PDF' : 'View PDF'}</span>
                    </button>
                  )}
                </div>

                {/* Detailed Order Match Summary */}
                <div className="space-y-2.5 text-xs bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'es' ? 'Persona:' : 'Person:'}</span>
                    </span>
                    <span className="font-bold text-indigo-300">{result.matched_purchase_item.person_name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'es' ? 'Número de Orden:' : 'Order Number:'}</span>
                    </span>
                    <span className="font-mono text-white font-semibold">{result.matched_purchase_item.order_number}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{language === 'es' ? 'Descripción:' : 'Description:'}</span>
                    <span className="text-slate-200 font-medium truncate max-w-[220px]">{result.matched_purchase_item.description}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-2">
                    <span className="text-slate-400">{language === 'es' ? 'Monto Total Actual del Pedido:' : 'Current Total:'}</span>
                    <span className="text-sm font-extrabold text-white font-mono">${result.matched_purchase_item.total_cost.toFixed(2)}</span>
                  </div>
                </div>

                {/* Check if invoice already attached */}
                {result.matched_purchase_item.invoice_url ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          {language === 'es' ? 'Esta orden ya tiene factura adjunta:' : 'This order already has an attached invoice:'}
                        </span>
                      </div>
                      {onOpenPreviewInvoice && (
                        <button
                          type="button"
                          onClick={() => onOpenPreviewInvoice(result.matched_purchase_item?.invoice_url || '')}
                          className="flex items-center space-x-1 text-xs text-amber-300 hover:underline font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{language === 'es' ? 'Ver Previa' : 'Preview'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-300 truncate bg-slate-900 p-2 rounded-lg">
                      {result.matched_purchase_item.invoice_url}
                    </p>

                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-bold text-slate-200">
                        {language === 'es' ? '¿Cómo deseas manejar la nueva factura?' : 'How would you like to handle the new invoice?'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAttachMode('replace')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                            attachMode === 'replace'
                              ? 'bg-amber-600 border-amber-500 text-white shadow-lg'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{language === 'es' ? 'Reemplazar Existente' : 'Replace Existing'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAttachMode('append')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                            attachMode === 'append'
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{language === 'es' ? 'Añadir Extra' : 'Add as Additional'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Confirm Action Button */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setResult(null)}
                    className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>

                  <button
                    onClick={() => handleAcceptMatch(result.matched_purchase_item!)}
                    disabled={loading}
                    className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'Attaching...' : (language === 'es' ? 'Aceptar & Adjuntar Factura' : 'Accept & Attach Invoice')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 rounded-2xl border-amber-500/30 space-y-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                  <h4 className="text-sm font-bold">
                    {language === 'es' ? 'No se encontró un pedido existente para este número de orden' : 'No existing order matches this invoice'}
                  </h4>
                </div>

                <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl font-mono">
                  <p><span className="text-slate-400">Order #:</span> <span className="text-white">{result.order_number || 'N/A'}</span></p>
                  <p><span className="text-slate-400">Amount in Invoice:</span> <span className="text-white">${result.total_cost.toFixed(2)}</span></p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    {language === 'es' ? 'Asignar a Persona:' : 'Assign to Person:'}
                  </label>
                  <select
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-semibold"
                  >
                    {persons.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">Detail Period:</label>
                  <select
                    value={detailPeriod}
                    onChange={(e) => setDetailPeriod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-semibold"
                  >
                    <option value="Julio-26">Julio-26</option>
                    <option value="Agosto-26">Agosto-26</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateUnmatchedPurchase}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{loading ? 'Creating...' : (language === 'es' ? 'Crear Nuevo Pedido con esta Factura' : 'Create New Order with Invoice')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
