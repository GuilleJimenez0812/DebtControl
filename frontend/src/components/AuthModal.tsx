import React, { useState, useEffect, useRef } from 'react';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import type { LoginResult } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<LoginResult>;
  onCompleteMFA: (mfaTicket: string, code: string) => Promise<LoginResult>;
  onRegister: (email: string, pass: string, name: string) => Promise<void>;
  registrationEnabled: boolean;
  onForgotPassword?: () => void;
}

const emailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  language,
  onClose,
  onLogin,
  onCompleteMFA,
  onRegister,
  registrationEnabled,
  onForgotPassword,
}) => {
  const t = translations[language];
  const reduceMotion = useReducedMotion();

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [mfaTicket, setMfaTicket] = useState<string>('');
  const [totpCode, setTotpCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setFullName('');
      setMfaTicket('');
      setTotpCode('');
      setError('');
      setLoading(false);
      setShowPassword(false);
      const id = window.setTimeout(() => emailRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (mfaTicket) {
      const id = window.setTimeout(() => totpRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [mfaTicket]);

  // Live validation
  const emailFieldError = email !== '' && !emailValid(email) ? t.invalidEmail : '';
  const passwordFieldError = password !== '' && password.length < 8 ? t.passwordTooShort : '';
  const nameFieldError = isRegisterMode && fullName.trim() === '' ? t.nameRequired : '';
  const totpFieldError = totpCode.length > 0 && totpCode.length !== 6 ? t.invalidCode : '';
  const hasFieldErrors =
    email !== '' && !emailValid(email) ||
    (password !== '' && password.length < 8) ||
    (isRegisterMode && fullName.trim() === '') ||
    (mfaTicket && totpCode.length !== 6);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasFieldErrors) return;
    setError('');
    setLoading(true);

    try {
      const result = await onLogin(email, password);
      if (result.mfa_pending && result.mfa_ticket) {
        setMfaTicket(result.mfa_ticket);
        setPassword('');
        setTotpCode('');
        setLoading(false);
        return;
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : t.authFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setError('');
    setLoading(true);

    try {
      await onCompleteMFA(mfaTicket, totpCode);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : t.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasFieldErrors) return;
    setError('');
    setLoading(true);

    try {
      await onRegister(email, password, fullName.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : t.authFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (mfaTicket) return handleMFASubmit(e);
    if (isRegisterMode) return handleRegisterSubmit(e);
    return handleLoginSubmit(e);
  };

  return (
    <Modal open={isOpen} onClose={onClose} width="sm">
      <div className="relative -m-6 overflow-hidden rounded-[14px] min-h-[420px]">
        {/* apple.com glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-[#BF5AF2]/35 blur-[100px]" />
          <div className="absolute -right-16 top-1/3 h-72 w-72 rounded-full bg-[#0071E3]/35 blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#0A84FF]/25 blur-[90px]" />
        </div>

        <div className="relative z-10 flex min-h-[420px] flex-col justify-center px-8 py-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/70 text-accent shadow-sm dark:bg-white/10">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3 className="text-xl font-bold text-ink dark:text-ink-dark">
              {mfaTicket ? t.mfaTitle : isRegisterMode ? t.registerTitle : t.signInTitle}
            </h3>
          </div>
          <p className="mb-6 text-xs text-ink-secondary dark:text-ink-secondary-dark">
            {mfaTicket ? t.mfaDesc : isRegisterMode ? t.registerDesc : t.signInDesc}
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mfaTicket ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.authenticatorCode}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
                  <Input
                    ref={totpRef}
                    type="text"
                    required
                    inputMode="numeric"
                    autoFocus
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className={`w-full pl-9 text-center font-mono text-lg tracking-[0.5em] ${totpFieldError ? 'border-danger' : ''}`}
                    aria-invalid={!!totpFieldError}
                  />
                </div>
                {totpFieldError && <p className="mt-1 text-[11px] font-medium text-danger">{totpFieldError}</p>}
                <motion.div
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="mt-4"
                >
                  <Button type="submit" disabled={loading || totpCode.length !== 6} className="w-full">
                    {loading ? t.processing : t.verifyAndSignIn}
                  </Button>
                </motion.div>
                <button
                  type="button"
                  onClick={() => {
                    setMfaTicket('');
                    setTotpCode('');
                    setError('');
                  }}
                  className="mt-3 w-full text-center text-xs font-medium text-ink-muted transition hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
                >
                  {t.backToSignIn}
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </form>

          {!mfaTicket && (
            <div className="mt-4 space-y-2 text-center">
              {registrationEnabled && (
                <button
                  onClick={() => {
                    setIsRegisterMode((m) => !m);
                    setError('');
                  }}
                  className="block w-full text-xs font-semibold text-accent transition hover:text-accent-hover dark:hover:text-accent-hover-dark"
                >
                  {isRegisterMode ? t.alreadyHaveAccount : t.noAccount}
                </button>
              )}
              {!isRegisterMode && onForgotPassword && (
                <button
                  onClick={() => {
                    onForgotPassword();
                  }}
                  className="block w-full text-xs font-medium text-ink-muted transition hover:text-accent dark:text-ink-muted-dark dark:hover:text-accent-hover-dark"
                >
                  {t.forgotPassword}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};