import React, { useState } from 'react';
import type { Person } from '../types';
import { X, CreditCard } from 'lucide-react';

interface NewPaymentModalProps {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { person_id: string; amount_paid: number; notes: string }) => Promise<void>;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  person,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !person) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        person_id: person.id,
        amount_paid: Number(amountPaid),
        notes: notes,
      });
      onClose();
    } catch {
      alert('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          <span>Record Payment for {person.name}</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Current Balance: <span className="font-bold text-amber-300">${person.balance.toFixed(2)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Paid ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={person.balance > 0 ? person.balance : undefined}
              required
              value={amountPaid}
              onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Reference (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank Transfer or Cash"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
