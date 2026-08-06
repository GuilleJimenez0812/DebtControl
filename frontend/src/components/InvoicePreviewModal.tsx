import React from 'react';
import type { Language } from '../i18n/translations';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  invoiceUrl: string | null;
  orderNumber?: string;
  language: Language;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  invoiceUrl,
  orderNumber,
  language,
  onClose,
}) => {
  if (!isOpen || !invoiceUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = invoiceUrl;
    link.download = invoiceUrl.split('/').pop() || 'Invoice.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-4xl h-[85vh] p-6 rounded-3xl border border-slate-700 shadow-2xl relative flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>{language === 'es' ? 'Vista Previa de la Factura' : 'Invoice Preview'}</span>
                {orderNumber && <span className="text-xs font-mono text-indigo-400 font-normal">({orderNumber})</span>}
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{invoiceUrl}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 mr-8">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'es' ? 'Descargar PDF' : 'Download PDF'}</span>
            </button>

            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* PDF / Image Preview Container */}
        <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
          {invoiceUrl.endsWith('.pdf') || invoiceUrl.includes('pdf') ? (
            <object data={invoiceUrl} type="application/pdf" className="w-full h-full">
              <div className="p-8 text-center space-y-4">
                <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-300">
                  {language === 'es' ? 'Vista previa integrada no disponible para este archivo.' : 'Embedded preview not available for this file.'}
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  {language === 'es' ? 'Descargar Factura PDF' : 'Download Invoice PDF'}
                </button>
              </div>
            </object>
          ) : (
            <img src={invoiceUrl} alt="Invoice Document" className="max-h-full max-w-full object-contain" />
          )}
        </div>
      </div>
    </div>
  );
};
