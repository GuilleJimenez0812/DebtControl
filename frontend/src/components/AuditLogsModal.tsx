import React, { useState } from 'react';
import { ShieldAlert, Clock, User, Activity, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Loader2 } from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

const actionTone = (action: string): 'success' | 'accent' | 'danger' | 'neutral' => {
  if (action === 'CREATE') return 'success';
  if (action === 'UPDATE') return 'accent';
  if (action === 'DELETE') return 'danger';
  return 'neutral';
};

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose, language }) => {
  const t = translations[language];
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page, limit],
    queryFn: () => apiService.getAuditLogs(limit, page * limit),
    enabled: isOpen,
  });

  const logs: AuditLog[] = data?.logs || [];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      width="lg"
      title={
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-danger" />
          <span>{t.auditLogsTitle}</span>
        </span>
      }
      subtitle={t.auditLogsDesc}
    >
      <div className="overflow-auto rounded-[10px] border border-line bg-black/[0.02] dark:border-line-dark dark:bg-white/[0.02]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/[0.03] text-xs font-semibold text-ink-tertiary dark:bg-white/[0.03] dark:text-ink-tertiary-dark">
              <th className="p-3 whitespace-nowrap border-b border-line dark:border-line-dark"><div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{t.timeCol}</span></div></th>
              <th className="p-3 whitespace-nowrap border-b border-line dark:border-line-dark"><div className="flex items-center gap-1"><User className="h-3 w-3" /><span>{t.userCol}</span></div></th>
              <th className="p-3 whitespace-nowrap border-b border-line dark:border-line-dark"><div className="flex items-center gap-1"><Activity className="h-3 w-3" /><span>{t.actionCol}</span></div></th>
              <th className="p-3 whitespace-nowrap border-b border-line dark:border-line-dark"><div className="flex items-center gap-1"><FileText className="h-3 w-3" /><span>{t.detailsCol}</span></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line dark:divide-line-dark">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-ink-muted dark:text-ink-muted-dark">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    {t.loadingLogs}
                  </span>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-ink-muted dark:text-ink-muted-dark">{t.noLogsFound}</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="text-xs transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <td className="p-3 whitespace-nowrap text-ink-secondary dark:text-ink-secondary-dark">
                    {new Date(log.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                  </td>
                  <td className="p-3 font-semibold text-accent">{log.user_email}</td>
                  <td className="p-3">
                    <Badge tone={actionTone(log.action)} className="uppercase">
                      {log.action} {log.entity_type}
                    </Badge>
                  </td>
                  <td className="max-w-xs break-words p-3 text-ink-secondary dark:text-ink-secondary-dark">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          <ChevronLeft className="h-4 w-4" />
          <span>{t.previous}</span>
        </Button>
        <span className="text-xs text-ink-muted dark:text-ink-muted-dark">{t.page} {page + 1}</span>
        <Button size="sm" variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={logs.length < limit}>
          <span>{t.next}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Modal>
  );
};