import React, { useState } from 'react';
import type { Person } from '../types';
import type { ParseInvoiceResult } from '../services/api';
import type { Language } from '../i18n/translations';
import { X, UploadCloud, AlertCircle, PlusCircle, CheckCircle2, User, Tag, FileText } from 'lucide-react';

interface UploadInvoiceModalProps {
  isOpen: boolean;
  persons: Person[];
  language: Language;
  onClose: () => void;
  onUpload: (file: File) => Promise<ParseInvoiceResult>;
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
  onCreatePurchase,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ParseInvoiceResult | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string>(persons[0]?.name || '');
  const [detailPeriod, setDetailPeriod] = useState<string>('Julio-26');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? (language === 'es' ? 'Analizando Factura...' : 'Parsing Invoice...') : (language === 'es' ? 'Buscar & Adjuntar Factura' : 'Match & Attach Invoice')}</span>
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {result.matched && result.matched_purchase_item ? (
              <div className="glass-card p-6 rounded-2xl border-emerald-500/40 bg-emerald-950/10 space-y-4">
                <div className="flex items-center space-x-3 border-b border-emerald-500/20 pb-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {language === 'es' ? '¡Factura Vinculada al Pedido!' : 'Invoice Attached to Order!'}
                    </h4>
                    <p className="text-xs text-emerald-300">
                      {language === 'es' ? 'Factura adjunta sin modificar saldos ni montos' : 'PDF document attached without modifying payments or balances'}
                    </p>
                  </div>
                </div>

                {/* Detailed Order Summary Card */}
                <div className="space-y-2.5 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'es' ? 'Persona Asignada:' : 'Assigned Person:'}</span>
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
                    <span className="text-slate-400">{language === 'es' ? 'Descripción del Pedido:' : 'Description:'}</span>
                    <span className="text-slate-200 font-medium truncate max-w-[220px]">{result.matched_purchase_item.description}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-2">
                    <span className="text-slate-400">{language === 'es' ? 'Monto Total del Pedido:' : 'Order Total:'}</span>
                    <span className="text-sm font-extrabold text-white font-mono">${result.matched_purchase_item.total_cost.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'es' ? 'Archivo Adjunto:' : 'Attachment:'}</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">{file?.name || 'Invoice PDF'}</span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  {language === 'es' ? 'Aceptar' : 'Done'}
                </button>
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
