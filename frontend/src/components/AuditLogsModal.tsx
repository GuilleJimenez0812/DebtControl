import React, { useState } from 'react';
import { X, ShieldAlert, Clock, User, Activity, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { Language } from '../i18n/translations';

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

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose, language }) => {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page, limit],
    queryFn: () => apiService.getAuditLogs(limit, page * limit),
    enabled: isOpen,
  });

  const logs: AuditLog[] = data?.logs || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-4xl p-6 rounded-3xl border border-slate-700 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>Audit Logs</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Tracking all administrative and mutation actions in the platform.
        </p>

        <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-xs font-semibold text-slate-300">
                <th className="p-3 border-b border-slate-700 whitespace-nowrap"><div className="flex items-center space-x-1"><Clock className="w-3 h-3" /><span>Time</span></div></th>
                <th className="p-3 border-b border-slate-700 whitespace-nowrap"><div className="flex items-center space-x-1"><User className="w-3 h-3" /><span>User</span></div></th>
                <th className="p-3 border-b border-slate-700 whitespace-nowrap"><div className="flex items-center space-x-1"><Activity className="w-3 h-3" /><span>Action</span></div></th>
                <th className="p-3 border-b border-slate-700 whitespace-nowrap"><div className="flex items-center space-x-1"><FileText className="w-3 h-3" /><span>Details</span></div></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 text-sm">No logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition border-b border-slate-800 text-xs">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                    </td>
                    <td className="p-3 text-indigo-300">{log.user_email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-500/20 text-emerald-400' :
                        log.action === 'UPDATE' ? 'bg-blue-500/20 text-blue-400' :
                        log.action === 'DELETE' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {log.action} {log.entity_type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 break-words max-w-xs">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <span className="text-xs text-slate-400">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < limit}
            className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
