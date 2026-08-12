import React, { useState, useEffect } from 'react';
import { ShieldCheck, QrCode, KeyRound } from 'lucide-react';
import { apiService } from '../services/api';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface TOTPSettingsModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
}

export const TOTPSettingsModal: React.FC<TOTPSettingsModalProps> = ({ isOpen, language, onClose }) => {
  const t = translations[language];
  const [enabled, setEnabled] = useState<boolean>(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify'>('idle');
  const [secret, setSecret] = useState<string>('');
  const [provisioningUri, setProvisioningUri] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const loadStatus = async () => {
    try {
      const status = await apiService.getTOTPStatus();
      setEnabled(status.totp_enabled);
      setSetupStep('idle');
      setSecret('');
      setProvisioningUri('');
      setCode('');
      setError('');
      setMessage('');
    } catch {
      setError(language === 'es' ? 'No se pudieron cargar los ajustes de seguridad.' : 'Failed to load security settings.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handleBeginSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiService.setupTOTP();
      setSecret(result.secret);
      setProvisioningUri(result.provisioning_uri);
      setSetupStep('verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (language === 'es' ? 'Error al iniciar la configuración TOTP.' : 'Failed to start TOTP setup.'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiService.enableTOTP(code);
      setMessage(t.totpEnabled);
      setEnabled(true);
      setSetupStep('idle');
      setCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiService.disableTOTP(code);
      setMessage(t.totpDisabled);
      setEnabled(false);
      setSetupStep('idle');
      setCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (language === 'es' ? 'Código inválido. No se pudo desactivar.' : 'Invalid code. Cannot disable.'));
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = provisioningUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(provisioningUri)}`
    : '';

  return (
    <Modal open={isOpen} onClose={onClose} width="sm">
      <div className="relative -m-6 overflow-hidden rounded-[14px] p-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent/10 text-accent dark:bg-accent/20">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-xl font-bold text-ink dark:text-ink-dark">{t.securityTitle}</h3>
            <p className="text-xs text-ink-secondary dark:text-ink-secondary-dark">{t.securityDesc}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs font-semibold text-danger">{error}</div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">{message}</div>
        )}

        {!enabled && setupStep === 'idle' && (
          <form onSubmit={handleBeginSetup} className="space-y-4">
            <div className="rounded-xl border border-line bg-panel p-4 text-xs text-ink-secondary dark:border-line-dark dark:bg-panel dark:text-ink-secondary-dark space-y-2">
              <p className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-accent" />
                <span>
                  {language === 'es' ? 'La autenticación de dos factores está' : 'Two-factor authentication is'}{' '}
                  <span className="font-semibold text-danger">{language === 'es' ? 'apagada' : 'off'}</span>.
                </span>
              </p>
              <p>{language === 'es'
                ? 'Cuando la actives, se te pedirá un código de tu app de autenticación (Google Authenticator, Authy, 1Password, etc.) tras iniciar sesión.'
                : 'When enabled, you\u2019ll be asked for a code from your authenticator app (Google Authenticator, Authy, 1Password, etc.) after signing in.'}
              </p>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t.processing : t.setupTotp}
            </Button>
          </form>
        )}

        {!enabled && setupStep === 'verify' && (
          <form onSubmit={handleEnable} className="space-y-4" noValidate>
            {qrUrl && (
              <div className="flex justify-center">
                <img src={qrUrl} alt="TOTP QR code" className="h-48 w-48 rounded-xl bg-white p-2" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.totpSetupHint}</label>
              <Input
                readOnly
                value={secret}
                onFocus={(e) => e.target.select()}
                className="w-full font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.enterTotpCodeFrom}</label>
              <Input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t.totpCodePlaceholder}
                className="w-full text-center font-mono text-lg tracking-[0.5em]"
              />
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="secondary" onClick={() => setSetupStep('idle')} className="flex-1">
                {t.cancel}
              </Button>
              <Button type="submit" disabled={loading || code.length !== 6} variant="success" className="flex-1">
                {loading ? t.verifying : t.confirmEnableTotp}
              </Button>
            </div>
          </form>
        )}

        {enabled && (
          <form onSubmit={handleDisable} className="space-y-4">
            <div className="rounded-xl border border-line bg-panel p-4 text-xs text-ink-secondary dark:border-line-dark dark:bg-panel dark:text-ink-secondary-dark flex items-center gap-2">
              <QrCode className="h-4 w-4 text-success" />
              <span>
                {language === 'es' ? 'La autenticación de dos factores está' : 'Two-factor authentication is'}{' '}
                <span className="font-semibold text-success">{language === 'es' ? 'activada' : 'on'}</span>.
              </span>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">{t.enterTotpCodeFrom}</label>
              <Input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t.totpCodePlaceholder}
                className="w-full text-center font-mono text-lg tracking-[0.5em]"
              />
            </div>
            <Button type="submit" disabled={loading || code.length !== 6} variant="danger" className="w-full">
              {loading ? t.processing : t.disableTotp}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};