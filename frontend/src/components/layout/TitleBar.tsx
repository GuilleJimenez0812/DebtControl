import React from 'react';
import type { User } from '../../types';
import type { Language } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import {
  Menu,
  Globe,
  Sun,
  Moon,
  Crown,
  ShieldCheck,
  LogOut,
  LogIn,
  KeyRound,
  FileUp,
  Users,
  DatabaseZap,
} from 'lucide-react';
import { Button } from '../ui/Button';

const TrafficLights: React.FC = () => (
  <div className="flex items-center gap-2 select-none" aria-hidden>
    <span className="group relative w-3 h-3 rounded-full bg-[#FF5F57]" />
    <span className="group relative w-3 h-3 rounded-full bg-[#FEBC2E]" />
    <span className="group relative w-3 h-3 rounded-full bg-[#28C840]" />
  </div>
);

interface TitleBarProps {
  user: User | null;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuthModal: () => void;
  onOpenAdminModal: () => void;
  onOpenAuditLogsModal?: () => void;
  onOpenUploadInvoiceModal?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenChangePasswordModal?: () => void;
  onLogout: () => void;
  onOpenMenu: () => void;
  onSeedData?: () => void;
  isSeeding?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  user,
  language,
  onLanguageChange,
  isDarkMode,
  onToggleTheme,
  onOpenAuthModal,
  onOpenAdminModal,
  onOpenAuditLogsModal,
  onOpenUploadInvoiceModal,
  onOpenSecurityModal,
  onOpenChangePasswordModal,
  onLogout,
  onOpenMenu,
  onSeedData,
  isSeeding,
}) => {
  const t = translations[language];
  const isAdmin = user?.role === 'admin';

  return (
    <div className="mac-vibrancy mac-vibrancy-light dark:mac-vibrancy sticky top-0 z-40 border-b border-line dark:border-line-dark">
      <div className="flex h-11 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <TrafficLights />
          <span className="text-[13px] font-semibold text-ink dark:text-ink-dark truncate">
            DebtControl
          </span>
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <button
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-muted hover:bg-black/5 hover:text-ink dark:text-ink-muted-dark dark:hover:bg-white/10 dark:hover:text-ink-dark"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language segmented */}
          <div className="hidden md:flex items-center gap-0.5 rounded-[8px] border border-line dark:border-line-dark p-0.5">
            <Globe className="ml-1 h-3.5 w-3.5 text-ink-muted dark:text-ink-muted-dark" />
            {(['es', 'en'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`rounded-[6px] px-2 py-0.5 text-xs font-semibold transition ${
                  language === lang
                    ? 'bg-accent text-white'
                    : 'text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleTheme}
            title="Toggle Light/Dark"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-muted hover:bg-black/5 hover:text-ink dark:text-ink-muted-dark dark:hover:bg-white/10 dark:hover:text-ink-dark"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && onOpenUploadInvoiceModal && isAdmin && (
            <Button size="sm" onClick={onOpenUploadInvoiceModal} className="hidden lg:inline-flex">
              <FileUp className="h-3.5 w-3.5" />
              <span>{language === 'es' ? 'Subir Factura' : 'Upload Invoice'}</span>
            </Button>
          )}

          {user && onOpenChangePasswordModal && (
            <Button size="sm" variant="secondary" onClick={onOpenChangePasswordModal} className="hidden lg:inline-flex" title="Change Password">
              <KeyRound className="h-3.5 w-3.5" />
            </Button>
          )}

          {user && onOpenSecurityModal && (
            <Button size="sm" variant="secondary" onClick={onOpenSecurityModal} className="hidden lg:inline-flex" title="Security">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
            </Button>
          )}

          {user ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-[8px] border border-line dark:border-line-dark px-2.5 h-8 text-xs text-ink-secondary dark:text-ink-secondary-dark">
                {isAdmin ? (
                  <Crown className="h-3.5 w-3.5 text-warning" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                )}
                <span className="font-semibold">{user.full_name}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={onLogout} title={t.logout}>
                <LogOut className="h-4 w-4 text-danger" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onOpenAuthModal} className="hidden md:inline-flex">
              <LogIn className="h-3.5 w-3.5" />
              {t.signIn}
            </Button>
          )}

          {user && isAdmin && onOpenAdminModal && (
            <div className="relative hidden lg:block">
              <Button size="sm" variant="secondary" onClick={onOpenAdminModal}>
                <Users className="h-3.5 w-3.5 text-accent" />
                Admin
              </Button>
              {onOpenAuditLogsModal && (
                <Button size="sm" variant="ghost" onClick={onOpenAuditLogsModal} title="Audit Logs" className="ml-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                </Button>
              )}
              {onSeedData && (
                <Button size="sm" variant="ghost" onClick={onSeedData} disabled={isSeeding} title="Seed Data" className="ml-1">
                  <DatabaseZap className={`h-3.5 w-3.5 text-accent ${isSeeding ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};