import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, QrCode, KeyRound } from 'lucide-react';
import { apiService } from '../services/api';

interface TOTPSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TOTPSettingsModal: React.FC<TOTPSettingsModalProps> = ({ isOpen, onClose }) => {
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
      setError('Failed to load security settings.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      setError(err instanceof Error ? err.message : 'Failed to start TOTP setup.');
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
      setMessage('Two-factor authentication enabled.');
      setEnabled(true);
      setSetupStep('idle');
      setCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification code invalid.');
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
      setMessage('Two-factor authentication disabled.');
      setEnabled(false);
      setSetupStep('idle');
      setCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code. Cannot disable.');
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = provisioningUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(provisioningUri)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span>Security Settings</span>
        </h3>
        <p className="text-xs text-slate-400 mb-5">Two-factor authentication with an authenticator app</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            {message}
          </div>
        )}

        {!enabled && setupStep === 'idle' && (
          <form onSubmit={handleBeginSetup} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Two-factor authentication is <span className="text-rose-400 font-semibold">off</span>.</span>
              </p>
              <p>When enabled, you&apos;ll be asked for a code from your authenticator app (Google Authenticator, Authy, 1Password, etc.) after signing in.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
            </button>
          </form>
        )}

        {!enabled && setupStep === 'verify' && (
          <form onSubmit={handleEnable} className="space-y-4">
            {qrUrl && (
              <div className="flex justify-center">
                <img src={qrUrl} alt="TOTP QR code" className="w-48 h-48 rounded-xl bg-white p-2" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Secret Key</label>
              <input
                readOnly
                value={secret}
                onFocus={(e) => e.target.select()}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Enter 6-digit code to confirm</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono text-center tracking-widest focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setSetupStep('idle')}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Confirm & Enable'}
              </button>
            </div>
          </form>
        )}

        {enabled && (
          <form onSubmit={handleDisable} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Two-factor authentication is <span className="text-emerald-400 font-semibold">on</span>.</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Enter current code to disable</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono text-center tracking-widest focus:outline-none focus:border-rose-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};