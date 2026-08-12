import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../services/api';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface ChangePasswordModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, language, onClose }) => {
  const t = translations[language];
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setMessage('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

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
      await apiService.changePassword(currentPassword, newPassword);
      setMessage(language === 'es'
        ? 'Contraseña cambiada. Se cerraron las demás sesiones.'
        : 'Password changed. Other sessions have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
            <h3 className="text-xl font-bold text-ink dark:text-ink-dark">{t.changePasswordTitle}</h3>
            <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark">{t.changePasswordDesc}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">{error}</div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.currentPassword}</label>
            <Input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.newPassword}</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pr-10"
                autoComplete="new-password"
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
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.confirmNewPassword}</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={12}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full"
              autoComplete="new-password"
            />
          </div>
          <div className="flex space-x-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              {t.cancel}
            </Button>
            <Button
              type="submit"
              isLoading={loading} disabled={loading || newPassword.length < 12 || newPassword !== confirmPassword || !currentPassword}
              className="flex-1"
            >
              {loading ? t.saving : t.changePasswordBtn}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};