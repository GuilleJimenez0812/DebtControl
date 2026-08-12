import React, { useState } from 'react';
import { Mail, KeyRound, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/api';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
}

type Step = 'email' | 'otp' | 'new-password';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, language, onClose }) => {
  const t = translations[language];
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [resetTicket, setResetTicket] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const reset = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetTicket('');
    setShowPassword(false);
    setError('');
    setMessage('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiService.requestPasswordReset(email);
      setMessage(t.resetCodeSent);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.invalidResetCode);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiService.verifyResetOTP(email, code);
      setResetTicket(result.reset_ticket);
      setStep('new-password');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.invalidResetCode);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 12) {
      setError(t.passwordMin12);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await apiService.resetPassword(resetTicket, newPassword);
      setMessage(t.passwordResetSuccess);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.passwordChangeFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose} width="sm">
      <div className="relative -m-6 overflow-hidden rounded-[14px] p-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent/10 text-accent dark:bg-accent/20">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-xl font-bold text-ink dark:text-ink-dark">{t.forgotPasswordTitle}</h3>
            <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark">
              {step === 'email' && t.forgotPasswordEmailStep}
              {step === 'otp' && t.forgotPasswordOtpStep}
              {step === 'new-password' && t.forgotPasswordNewStep}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">{error}</div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">{message}</div>
        )}

        {step === 'email' && (
          <form onSubmit={handleRequest} className="space-y-4" noValidate>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="w-full pl-9" />
            </div>
            <Button type="submit" disabled={loading || !email} className="w-full">
              {loading ? t.sending : t.sendResetCode}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="space-y-4" noValidate>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
              <Input type="email" value={email} readOnly className="w-full pl-9 opacity-70" />
            </div>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
              <Input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full pl-9 text-center font-mono text-lg tracking-[0.5em]"
              />
            </div>
            <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
              {loading ? t.verifying : t.verifyCode}
            </Button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-center text-xs font-medium text-ink-muted transition hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
            >
              {t.resendCodeOrChangeEmail}
            </button>
          </form>
        )}

        {step === 'new-password' && (
          <form onSubmit={handleReset} className="space-y-4" noValidate>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.newPassword}
                className="w-full pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted transition hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.confirmNewPassword}
                className="w-full pl-9"
              />
            </div>
            <Button type="submit" disabled={loading || newPassword.length < 12 || newPassword !== confirmPassword} className="w-full">
              {loading ? t.saving : t.resetPassword}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};