import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import type { LoginResult } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<LoginResult>;
  onCompleteMFA: (mfaTicket: string, code: string) => Promise<LoginResult>;
  onRegister: (email: string, pass: string, name: string) => Promise<void>;
  registrationEnabled: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onCompleteMFA,
  onRegister,
  registrationEnabled,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [mfaTicket, setMfaTicket] = useState<string>('');
  const [totpCode, setTotpCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setIsRegisterMode(false);
    setPassword('');
    setTotpCode('');
    setMfaTicket('');
    setError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin(email, password);
      if (result.mfa_pending && result.mfa_ticket) {
        setMfaTicket(result.mfa_ticket);
        setPassword('');
        setLoading(false);
        return;
      }
      resetForm();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onCompleteMFA(mfaTicket, totpCode);
      resetForm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification code invalid.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onRegister(email, password, fullName);
      resetForm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (mfaTicket) {
      return handleMFASubmit(e);
    }
    if (isRegisterMode) {
      return handleRegisterSubmit(e);
    }
    return handleLoginSubmit(e);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2">
          {mfaTicket
            ? 'Enter Verification Code'
            : isRegisterMode
            ? 'Create DebtControl Account'
            : 'Sign In to DebtControl'}
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          {mfaTicket
            ? 'Enter the 6-digit code from your authenticator app'
            : isRegisterMode
            ? 'Enter details to register a new user account'
            : 'Access debt control dashboard and record transactions'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mfaTicket && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Authenticator Code</label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoFocus
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition tracking-widest text-center"
                />
              </div>
            </div>
          )}

          {isRegisterMode && !mfaTicket && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Guillermo Jimenez"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          )}

          {!mfaTicket && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          )}

          {!mfaTicket && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-white text-sm shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
          >
            {loading
              ? 'Processing...'
              : mfaTicket
              ? 'Verify & Sign In'
              : isRegisterMode
              ? 'Register Account'
              : 'Sign In'}
          </button>

          {mfaTicket && (
            <button
              type="button"
              onClick={() => {
                setMfaTicket('');
                setTotpCode('');
                setError('');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Back to sign in
            </button>
          )}
        </form>

        {registrationEnabled && !mfaTicket && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              {isRegisterMode
                ? 'Already have an account? Sign In'
                : "Don't have an account? Register"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
