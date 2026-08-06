import React from 'react';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Lock, LogIn } from 'lucide-react';

interface AuthWallProps {
  language: Language;
  onOpenAuthModal: () => void;
}

export const AuthWall: React.FC<AuthWallProps> = ({ language, onOpenAuthModal }) => {
  const t = translations[language];

  return (
    <div className="glass-panel p-12 rounded-3xl text-center max-w-lg mx-auto my-12 border border-slate-800 shadow-2xl">
      <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
        <Lock className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{t.authWallTitle}</h3>
      <p className="text-sm text-slate-400 mb-6">{t.authWallDesc}</p>
      <button
        onClick={onOpenAuthModal}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition inline-flex items-center space-x-2"
      >
        <LogIn className="w-4 h-4" />
        <span>{t.signIn}</span>
      </button>
    </div>
  );
};
