import React, { useState, useEffect } from 'react';
import type { Person } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { CreditCard, Zap, Wallet } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useToast } from './ui/Toast';

interface NewPaymentModalProps {
  person: Person | null;
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onSubmit: (payload: { person_id: string; amount_paid: number; notes: string }) => Promise<void>;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  person,
  isOpen,
  language,
  onClose,
  onSubmit,
}) => {
  const t = translations[language];
  const { toast } = useToast();
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const money = (n: number) => `$${n.toFixed(2)}`;

  useEffect(() => {
    if (isOpen) {
      setAmountPaid(0);
      setNotes('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !person) return null;

  const balance = person.balance > 0 ? person.balance : 0;
  const isPartial = amountPaid > 0 && amountPaid < balance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) return;
    setLoading(true);
    try {
      await onSubmit({
        person_id: person.id,
        amount_paid: Number(amountPaid),
        notes: notes,
      });
      toast('success', t.paymentSaved);
      onClose();
    } catch {
      toast('error', t.paymentFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      width="sm"
      title={
        <span className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-success" />
          <span>{t.recordPaymentFor} {person.name}</span>
        </span>
      }
      subtitle={
        <span>
          {t.currentBalance}:{' '}
          <span className="font-bold text-warning font-mono tabular-nums">${balance.toFixed(2)}</span>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isPartial && (
          <Badge tone="accent">
            <Wallet className="h-3.5 w-3.5" />
            <span>{t.partialPayment}</span>
          </Badge>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            {t.amountPaid}
          </label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={balance > 0 ? balance : undefined}
            required
            value={amountPaid}
            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
            className="w-full font-mono tabular-nums"
            placeholder={t.paymentAmountPlaceholder}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-tertiary dark:text-ink-tertiary-dark">
              {t.paymentMax}: {money(balance)}
            </span>
            {balance > 0 && (
              <button
                type="button"
                onClick={() => setAmountPaid(balance)}
                className="inline-flex items-center gap-1 rounded-[8px] bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/20"
              >
                <Zap className="h-3 w-3" />
                <span>{t.payFullBalance}</span>
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            {t.notesReference}
          </label>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.bankTransferPlaceholder}
            className="w-full"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" variant="success" isLoading={loading} disabled={loading || amountPaid <= 0} className="w-full">
            {loading ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar Pago' : 'Save Payment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};