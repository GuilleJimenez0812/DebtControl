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
    link.download = `${orderNumber || 'Invoice'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fade-in">
      <div className="glass-panel w-full max-w-5xl h-[88vh] p-6 rounded-3xl border border-slate-700 shadow-2xl relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>{language === 'es' ? 'Previsualización de Documento PDF' : 'PDF Document Preview'}</span>
                {orderNumber && <span className="text-xs font-mono text-indigo-400 font-normal">({orderNumber})</span>}
              </h3>
              <p className="text-xs text-slate-400">{language === 'es' ? 'Documento PDF original de la factura' : 'Original invoice PDF document'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 mr-12">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-xl shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'es' ? 'Descargar PDF' : 'Download PDF'}</span>
            </button>

            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition flex items-center space-x-1 text-xs font-semibold"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              <span>{language === 'es' ? 'Abrir en Pestaña' : 'Open Tab'}</span>
            </a>
          </div>
        </div>

        {/* Real PDF Embed / Iframe Viewer */}
        <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner">
          <iframe
            src={invoiceUrl}
            title="PDF Invoice Viewer"
            className="w-full h-full rounded-2xl border-0 bg-slate-950"
          />
        </div>
      </div>
    </div>
  );
};
