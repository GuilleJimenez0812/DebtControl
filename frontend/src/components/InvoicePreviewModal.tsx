import React from 'react';
import type { Language } from '../i18n/translations';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

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
    <Modal
      open={isOpen}
      onClose={onClose}
      width="lg"
      title={
        <span className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          <span>{language === 'es' ? 'Previsualización de Documento PDF' : 'PDF Document Preview'}</span>
          {orderNumber && <span className="font-mono text-xs font-normal text-accent">({orderNumber})</span>}
        </span>
      }
      subtitle={language === 'es' ? 'Documento PDF original de la factura' : 'Original invoice PDF document'}
      showClose={false}
    >
      <div className="-mx-6 -mb-6 flex flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-line px-6 py-3 dark:border-line-dark">
          <Button size="sm" variant="success" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            <span>{language === 'es' ? 'Descargar PDF' : 'Download PDF'}</span>
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.open(invoiceUrl, '_blank', 'noopener,noreferrer')}>
            <ExternalLink className="h-4 w-4 text-accent" />
            <span>{language === 'es' ? 'Abrir en Pestaña' : 'Open Tab'}</span>
          </Button>
        </div>
        <div className="h-[72vh] overflow-hidden rounded-b-[14px] bg-black/[0.04] dark:bg-black/40">
          <iframe src={invoiceUrl} title="PDF Invoice Viewer" className="h-full w-full border-0" />
        </div>
      </div>
    </Modal>
  );
};