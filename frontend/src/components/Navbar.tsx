import React from 'react';
import type { User } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { CreditCard, LogIn, LogOut, ShieldCheck, Database, Globe, Sun, Moon, Users, Crown, FileUp } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuthModal: () => void;
  onOpenAdminModal: () => void;
  onOpenUploadInvoiceModal?: () => void;
  onLogout: () => void;
  onSeedData: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  language,
  onLanguageChange,
  isDarkMode,
  onToggleTheme,
  onOpenAuthModal,
  onOpenAdminModal,
  onOpenUploadInvoiceModal,
  onLogout,
  onSeedData,
  isSeeding,
}) => {
  const t = translations[language];

  return (
    <header className="glass-panel sticky top-0 z-40 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/30 text-indigo-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              DebtControl
            </h1>
            <p className="text-xs text-slate-400">{t.tagline}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => onLanguageChange('es')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                language === 'es' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ES
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                language === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Seed Data */}
          {user && (
            <button
              onClick={onSeedData}
              disabled={isSeeding}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isSeeding ? t.seeding : t.seedData}</span>
            </button>
          )}

          {/* Upload Invoice Button for Admin */}
          {user && user.role === 'admin' && onOpenUploadInvoiceModal && (
            <button
              onClick={onOpenUploadInvoiceModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
            >
              <FileUp className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{language === 'es' ? 'Subir Factura' : 'Upload Invoice'}</span>
            </button>
          )}

          {/* Admin User Management Button */}
          {user && user.role === 'admin' && (
            <button
              onClick={onOpenAdminModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">User Permissions</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300" title={user.role === 'admin' ? 'Administrator Role' : 'User Role'}>
                {user.role === 'admin' ? (
                  <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
                <span className="font-semibold text-slate-200">{user.full_name}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.signIn}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
