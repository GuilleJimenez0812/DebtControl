import React, { useState, useEffect, useRef } from 'react';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string, name: string) => Promise<void>;
}

const emailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  language,
  onClose,
  onLogin,
  onRegister,
}) => {
  const t = translations[language];
  const reduceMotion = useReducedMotion();

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setFullName('');
      setError('');
      setLoading(false);
      setShowPassword(false);
      const id = window.setTimeout(() => emailRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  // Live validation
  const emailFieldError = email !== '' && !emailValid(email) ? t.invalidEmail : '';
  const passwordFieldError = password !== '' && password.length < 8 ? t.passwordTooShort : '';
  const nameFieldError = isRegisterMode && fullName.trim() === '' ? t.nameRequired : '';
  const hasFieldErrors =
    !emailValid(email) ||
    password.length < 8 ||
    (isRegisterMode && fullName.trim() === '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasFieldErrors) return;
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        await onRegister(email, password, fullName.trim());
      } else {
        await onLogin(email, password);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t.authFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} width="sm">
      <div className="relative -m-6 overflow-hidden rounded-[14px] h-[500px]">
        {/* apple.com glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-[#BF5AF2]/35 blur-[100px]" />
          <div className="absolute -right-16 top-1/3 h-72 w-72 rounded-full bg-[#0071E3]/35 blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#0A84FF]/25 blur-[90px]" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-center px-8 py-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/70 text-accent shadow-sm dark:bg-white/10">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-bold text-ink dark:text-ink-dark">
              {isRegisterMode ? t.registerTitle : t.signInTitle}
            </h3>
          </div>
          <p className="mb-6 text-xs text-ink-secondary dark:text-ink-secondary-dark">
            {isRegisterMode ? t.registerDesc : t.signInDesc}
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AnimatePresence mode={reduceMotion ? 'popLayout' : 'wait'}>
              {isRegisterMode && (
                <motion.div
                  key="name"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.fullName}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
                    <Input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Guillermo Jimenez"
                      className={`w-full pl-9 ${nameFieldError ? 'border-danger' : ''}`}
                      aria-invalid={!!nameFieldError}
                    />
                  </div>
                  {nameFieldError && <p className="mt-1 text-[11px] font-medium text-danger">{nameFieldError}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.emailAddress}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
                <Input
                  ref={emailRef}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={`w-full pl-9 ${emailFieldError ? 'border-danger' : ''}`}
                  aria-invalid={!!emailFieldError}
                />
              </div>
              {emailFieldError && <p className="mt-1 text-[11px] font-medium text-danger">{emailFieldError}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full py-2 pl-9 pr-10 ${passwordFieldError ? 'border-danger' : ''}`}
                  aria-invalid={!!passwordFieldError}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted transition hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordFieldError && <p className="mt-1 text-[11px] font-medium text-danger">{passwordFieldError}</p>}
            </div>

            <motion.div
              whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Button type="submit" disabled={loading || hasFieldErrors} className="w-full">
                {loading ? t.processing : isRegisterMode ? t.registerAccount : t.signIn}
              </Button>
            </motion.div>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegisterMode((m) => !m);
                setError('');
              }}
              className="text-xs font-semibold text-accent transition hover:text-accent-hover dark:hover:text-accent-hover-dark"
            >
              {isRegisterMode ? t.alreadyHaveAccount : t.noAccount}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};