import React from 'react';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Lock, LogIn } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';

interface AuthWallProps {
  language: Language;
  onOpenAuthModal: () => void;
}

export const AuthWall: React.FC<AuthWallProps> = ({ language, onOpenAuthModal }) => {
  const t = translations[language];
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mx-auto my-12 max-w-lg p-1">
      {/* apple.com glow behind the card */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 -top-14 h-56 w-56 rounded-full bg-[#BF5AF2]/30 blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[#0071E3]/30 blur-[90px]" />
      </div>

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative rounded-[14px] border border-line bg-panel p-10 text-center shadow-apple dark:border-line-dark dark:bg-panel dark:shadow-apple-dark"
      >
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[14px] bg-accent/10 text-accent dark:bg-accent/20">
          <Lock className="h-8 w-8" />
        </span>
        <h3 className="text-2xl font-bold text-ink dark:text-ink-dark">{t.authWallTitle}</h3>
        <p className="mb-6 text-sm text-ink-secondary dark:text-ink-secondary-dark">{t.authWallDesc}</p>
        <Button onClick={onOpenAuthModal} size="lg">
          <LogIn className="h-4 w-4" />
          <span>{t.signIn}</span>
        </Button>
      </motion.div>
    </div>
  );
};