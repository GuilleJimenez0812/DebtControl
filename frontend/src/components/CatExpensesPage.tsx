import React, { useState, useEffect } from 'react';
import { apiService as api } from '../services/api';
import type { CatExpense, User } from '../types';
const formatCurrency = (n: number, sym: string) => `${sym}${n.toFixed(2)}`;
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
}

interface CatExpensesPageProps {
  user: User | null;
  language: 'en' | 'es';
}

export const CatExpensesPage: React.FC<CatExpensesPageProps> = ({ language }) => {
  const [expenses, setExpenses] = useState<CatExpense[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [itemName, setItemName] = useState('');
  const [platform, setPlatform] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [currencyInput, setCurrencyInput] = useState<'USD' | 'VEF'>('USD');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedRates: any = await api.getExchangeRates();
      // the api response is an array of ExchangeRate, let's cast it
      setRates(fetchedRates);
      
      const fetchedExpenses = await api.getCatExpenses();
      setExpenses(fetchedExpenses);
    } catch (err) {
      console.error('Failed to load cat expenses', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert logic
    let amountUSD = 0;
    let amountVEF = 0;
    const val = parseFloat(amountInput) || 0;
    
    const usdRateObj = rates.find(r => r.currency === 'USD');
    const usdRate = usdRateObj?.rate || 1;
    const rateId = usdRateObj?.id;

    if (currencyInput === 'USD') {
      amountUSD = val;
      amountVEF = val * usdRate;
    } else {
      amountVEF = val;
      amountUSD = usdRate > 0 ? val / usdRate : 0;
    }

    const payload: Partial<CatExpense> = {
      item_name: itemName,
      platform,
      payment_method: paymentMethod,
      amount_usd: amountUSD,
      amount_vef: amountVEF,
      exchange_rate_id: rateId,
      expense_date: expenseDate,
    };

    try {
      if (editingId) {
        await api.updateCatExpense(editingId, payload);
      } else {
        await api.createCatExpense(payload);
      }
      setIsFormOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save expense', err);
      alert('Error saving expense');
    }
  };

  const handleEdit = (exp: CatExpense) => {
    setEditingId(exp.id);
    setItemName(exp.item_name);
    setPlatform(exp.platform);
    setPaymentMethod(exp.payment_method);
    setAmountInput(exp.amount_usd.toString());
    setCurrencyInput('USD');
    setExpenseDate(exp.expense_date.split('T')[0]);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Estás seguro de eliminar este gasto?' : 'Are you sure you want to delete this expense?')) return;
    try {
      await api.deleteCatExpense(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setItemName('');
    setPlatform('');
    setPaymentMethod('');
    setAmountInput('');
    setCurrencyInput('USD');
    setExpenseDate(new Date().toISOString().slice(0, 10));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-ink-muted">Loading...</div>;
  }

  const usdRate = rates.find(r => r.currency === 'USD')?.rate;
  

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-ink dark:text-ink-dark">
          {language === 'es' ? 'Gastos de Gatos' : 'Cat Expenses'}
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-ink-muted dark:text-ink-muted-dark bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg">
            BCV USD: {usdRate ? formatCurrency(usdRate, 'Bs') : 'N/A'}
          </div>
          <button
            onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent/90 transition shadow-lg shadow-accent/20"
          >
            <Plus className="w-4 h-4" />
            {language === 'es' ? 'Añadir Gasto' : 'Add Expense'}
          </button>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-line dark:border-line-dark shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-ink dark:text-ink-dark">
            {editingId ? (language === 'es' ? 'Editar Gasto' : 'Edit Expense') : (language === 'es' ? 'Nuevo Gasto' : 'New Expense')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-muted dark:text-ink-muted-dark mb-1">
                {language === 'es' ? 'Ítem' : 'Item'}
              </label>
              <input required type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-line dark:border-line-dark rounded-xl px-4 py-2 text-ink dark:text-ink-dark" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted dark:text-ink-muted-dark mb-1">
                {language === 'es' ? 'Fecha' : 'Date'}
              </label>
              <input required type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-line dark:border-line-dark rounded-xl px-4 py-2 text-ink dark:text-ink-dark" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted dark:text-ink-muted-dark mb-1">
                {language === 'es' ? 'Plataforma' : 'Platform'}
              </label>
              <input required type="text" placeholder="Ej: Amazon, Mercadolibre" value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-line dark:border-line-dark rounded-xl px-4 py-2 text-ink dark:text-ink-dark" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted dark:text-ink-muted-dark mb-1">
                {language === 'es' ? 'Método de Pago' : 'Payment Method'}
              </label>
              <input required type="text" placeholder="Ej: Zelle, Pago Móvil" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-line dark:border-line-dark rounded-xl px-4 py-2 text-ink dark:text-ink-dark" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-muted dark:text-ink-muted-dark mb-1">
                {language === 'es' ? 'Monto' : 'Amount'}
              </label>
              <div className="flex gap-2">
                <input required type="number" step="0.01" min="0" value={amountInput} onChange={e => setAmountInput(e.target.value)} className="flex-1 bg-black/5 dark:bg-white/5 border border-line dark:border-line-dark rounded-xl px-4 py-2 text-ink dark:text-ink-dark" />
                <select value={currencyInput} onChange={e => setCurrencyInput(e.target.value as 'USD'|'VEF')} className="bg-black/5 dark:bg-white/5 border border-line dark:border-line-dark rounded-xl px-4 py-2 text-ink dark:text-ink-dark">
                  <option value="USD">USD</option>
                  <option value="VEF">Bs</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl text-sm font-bold text-ink-muted hover:bg-black/5 dark:text-ink-muted-dark dark:hover:bg-white/5 transition">
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 transition shadow-lg shadow-accent/20">
              {language === 'es' ? 'Guardar' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel rounded-2xl border border-line dark:border-line-dark overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line dark:border-line-dark bg-black/5 dark:bg-white/5">
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted dark:text-ink-muted-dark uppercase">{language === 'es' ? 'Fecha' : 'Date'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted dark:text-ink-muted-dark uppercase">{language === 'es' ? 'Ítem' : 'Item'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted dark:text-ink-muted-dark uppercase">{language === 'es' ? 'Monto (USD)' : 'Amount (USD)'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted dark:text-ink-muted-dark uppercase">{language === 'es' ? 'Monto (Bs)' : 'Amount (Bs)'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted dark:text-ink-muted-dark uppercase">{language === 'es' ? 'Plataforma' : 'Platform'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted dark:text-ink-muted-dark uppercase">{language === 'es' ? 'Método' : 'Method'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-ink-muted dark:text-ink-muted-dark uppercase text-right">{language === 'es' ? 'Acciones' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line-dark">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-muted dark:text-ink-muted-dark text-sm">
                    {language === 'es' ? 'No hay gastos registrados.' : 'No expenses found.'}
                  </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-sm text-ink dark:text-ink-dark whitespace-nowrap">
                      {new Date(exp.expense_date).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink dark:text-ink-dark font-medium">
                      {exp.item_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink dark:text-ink-dark whitespace-nowrap">
                      {formatCurrency(exp.amount_usd, '$')}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted dark:text-ink-muted-dark whitespace-nowrap">
                      {formatCurrency(exp.amount_vef, 'Bs')}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted dark:text-ink-muted-dark">
                      {exp.platform}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted dark:text-ink-muted-dark">
                      {exp.payment_method}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap space-x-2">
                      <button onClick={() => handleEdit(exp)} className="p-1.5 text-ink-muted hover:text-accent hover:bg-accent/10 rounded-lg transition" title={language === 'es' ? 'Editar' : 'Edit'}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-ink-muted hover:text-error hover:bg-error/10 rounded-lg transition" title={language === 'es' ? 'Eliminar' : 'Delete'}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
