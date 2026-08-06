import React, { useState } from 'react';
import type { PurchaseItem, ShippingPackage } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { X, FileText, Edit2, Save, Package, Eye } from 'lucide-react';

interface PurchaseDetailModalProps {
  purchase: PurchaseItem | null;
  packages: ShippingPackage[];
  isOpen: boolean;
  language: Language;
  userRole?: string;
  onClose: () => void;
  onOpenPreviewInvoice?: (url: string) => void;
  onUpdatePurchase: (id: string, payload: { item_amount: number; tax_amount: number; shipping_cost: number; invoice_url?: string }) => Promise<void>;
  onUpdatePackage: (id: string, payload: { shipping_cost: number; warehouse_received: boolean; personally_received: boolean; dispatch_date: string }) => Promise<void>;
  onCreatePackage?: (purchaseId: string, trackingNumber: string, shippingCost: number) => Promise<void>;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  purchase,
  packages,
  isOpen,
  language,
  userRole,
  onClose,
  onOpenPreviewInvoice,
  onUpdatePurchase,
  onUpdatePackage,
  onCreatePackage,
}) => {
  const t = translations[language];
  const isAdmin = userRole === 'admin';

  const [isEditingPurchase, setIsEditingPurchase] = useState<boolean>(false);
  const [itemAmount, setItemAmount] = useState<number>(purchase?.item_amount || 0);
  const [taxAmount, setTaxAmount] = useState<number>(purchase?.tax_amount || 0);
  const [shippingCost, setShippingCost] = useState<number>(purchase?.shipping_cost || 0);
  const [invoiceUrl, setInvoiceUrl] = useState<string>(purchase?.invoice_url || '');

  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgShippingCost, setPkgShippingCost] = useState<number>(0);
  const [pkgWarehouse, setPkgWarehouse] = useState<boolean>(false);
  const [pkgPersonally, setPkgPersonally] = useState<boolean>(false);
  const [pkgDispatchDate, setPkgDispatchDate] = useState<string>('');

  const [isAddingTracking, setIsAddingTracking] = useState<boolean>(false);
  const [newTrackingNumber, setNewTrackingNumber] = useState<string>('');
  const [newPkgShippingCost, setNewPkgShippingCost] = useState<number>(0);
  const [isSubmittingTracking, setIsSubmittingTracking] = useState<boolean>(false);

  if (!isOpen || !purchase) return null;

  const relatedPackages = packages.filter(
    (pkg) => pkg.order_number === purchase.order_number || (purchase.description && pkg.item_description && pkg.item_description.includes(purchase.description))
  );

  const attachedInvoices = purchase.invoice_url
    ? purchase.invoice_url.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const handleSavePurchase = async () => {
    await onUpdatePurchase(purchase.id, {
      item_amount: Number(itemAmount),
      tax_amount: Number(taxAmount),
      shipping_cost: Number(shippingCost),
      invoice_url: invoiceUrl,
    });
    setIsEditingPurchase(false);
  };

  const handleStartEditPackage = (pkg: ShippingPackage) => {
    setEditingPkgId(pkg.id);
    setPkgShippingCost(pkg.shipping_cost);
    setPkgWarehouse(pkg.warehouse_received);
    setPkgPersonally(pkg.personally_received);
    setPkgDispatchDate(pkg.dispatch_date || '');
  };

  const handleSavePackage = async (pkgId: string) => {
    await onUpdatePackage(pkgId, {
      shipping_cost: Number(pkgShippingCost),
      warehouse_received: pkgWarehouse,
      personally_received: pkgPersonally,
      dispatch_date: pkgDispatchDate,
    });
    setEditingPkgId(null);
  };

  const handleAddTracking = async () => {
    if (!newTrackingNumber.trim() || !onCreatePackage) return;
    setIsSubmittingTracking(true);
    try {
      await onCreatePackage(purchase.id, newTrackingNumber.trim(), newPkgShippingCost);
      setNewTrackingNumber('');
      setNewPkgShippingCost(0);
      setIsAddingTracking(false);
    } catch (error) {
      console.error("Failed to add tracking:", error);
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-3xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{purchase.description}</h3>
            <p className="text-xs text-slate-400 font-mono">
              Order: {purchase.order_number || 'N/A'} • Person: <span className="text-indigo-300 font-semibold">{purchase.person_name}</span>
            </p>
          </div>
        </div>

        {/* Purchase Amounts Section */}
        <div className="glass-card p-4 rounded-2xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cost Breakdown & Invoice</span>
            {isAdmin && (
              !isEditingPurchase ? (
                <button
                  onClick={() => {
                    setItemAmount(purchase.item_amount);
                    setTaxAmount(purchase.tax_amount);
                    setShippingCost(purchase.shipping_cost);
                    setInvoiceUrl(purchase.invoice_url || '');
                    setIsEditingPurchase(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-semibold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Amounts</span>
                </button>
              ) : (
                <button
                  onClick={handleSavePurchase}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Purchase</span>
                </button>
              )
            )}
          </div>

          {!isEditingPurchase ? (
            <div className="grid grid-cols-4 gap-3 text-center border-t border-slate-800 pt-3">
              <div>
                <p className="text-xs text-slate-400">{t.itemAmount}</p>
                <p className="text-sm font-bold font-mono text-slate-200">${purchase.item_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t.taxAmount}</p>
                <p className="text-sm font-bold font-mono text-slate-300">${purchase.tax_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t.shippingCost}</p>
                <p className="text-sm font-bold font-mono text-slate-300">${purchase.shipping_cost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-400 font-semibold">{t.totalCost}</p>
                <p className="text-base font-extrabold font-mono text-indigo-300">${purchase.total_cost.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.itemAmount}</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemAmount}
                  onChange={(e) => setItemAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.taxAmount}</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono"
                />
              </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{t.shippingCost || 'Shipping ($)'}</label>
                    <div className="relative">
                      <input
                        type="number"
                        disabled
                        value={shippingCost}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-2 text-xs text-slate-500 font-mono cursor-not-allowed"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" title="Shipping cost is calculated automatically from tracking records">
                        <Package className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
            </div>
          )}

          {/* Invoice PDF Section */}
          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs">
            <span className="text-slate-400 flex items-center space-x-1.5 font-semibold">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>{t.invoicePdf}</span>
            </span>

            {attachedInvoices.length === 0 ? (
              <p className="text-slate-500 italic">{t.noInvoice}</p>
            ) : (
              <div className="space-y-1.5">
                {attachedInvoices.map((invUrl, index) => {
                  const cleanName = invUrl.startsWith('blob:')
                    ? `Factura_${purchase.order_number || 'Pedido'}.pdf`
                    : invUrl.split('/').pop() || invUrl;

                  return (
                    <div key={index} className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <span className="font-mono text-slate-300 text-xs truncate max-w-[280px]" title={cleanName}>
                        {cleanName}
                      </span>
                      {onOpenPreviewInvoice && (
                        <button
                          onClick={() => onOpenPreviewInvoice(invUrl)}
                          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{language === 'es' ? 'Ver Factura' : 'View Invoice'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Shipping Packages Tracking Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-300">Package Tracking Records</h4>

          {relatedPackages.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 glass-card rounded-2xl text-center">
              No tracking records associated with this order number.
            </p>
          ) : (
            relatedPackages.map((pkg) => {
              const isPkgEditing = editingPkgId === pkg.id;

              return (
                <div key={pkg.id} className="glass-card p-4 rounded-2xl text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-300 font-bold">{pkg.tracking_number || 'No Tracking ID'}</span>
                    {isAdmin && (
                      !isPkgEditing ? (
                        <button
                          onClick={() => handleStartEditPackage(pkg)}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-semibold"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Update Tracking</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSavePackage(pkg.id)}
                          className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 font-semibold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Package</span>
                        </button>
                      )
                    )}
                  </div>

                  {!isPkgEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Shipping Cost:</span>
                        <span className="font-mono font-bold">${pkg.shipping_cost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Warehouse:</span>
                        <span className={pkg.warehouse_received ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {pkg.warehouse_received ? '✓ Received' : 'Pending'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Personally:</span>
                        <span className={pkg.personally_received ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {pkg.personally_received ? '✓ Received' : 'Pending'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Dispatch Flight:</span>
                        <span className="text-slate-200">{pkg.dispatch_date || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Shipping Cost ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={pkgShippingCost}
                            onChange={(e) => setPkgShippingCost(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Dispatch Flight Date</label>
                          <input
                            type="text"
                            value={pkgDispatchDate}
                            onChange={(e) => setPkgDispatchDate(e.target.value)}
                            placeholder="e.g. Viernes 17"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pkgWarehouse}
                            onChange={(e) => setPkgWarehouse(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Received in Warehouse</span>
                        </label>

                        <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pkgPersonally}
                            onChange={(e) => setPkgPersonally(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Received Personally</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          
          {/* Add Tracking Section */}
          {isAdmin && (
            <div className="mt-4 border-t border-slate-800/80 pt-4">
              {!isAddingTracking ? (
                <button
                  onClick={() => setIsAddingTracking(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 rounded-xl transition"
                >
                  {t.addTracking || '+ Add Tracking Number'}
                </button>
              ) : (
                <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-2">
                  <input
                    type="text"
                    value={newTrackingNumber}
                    onChange={(e) => setNewTrackingNumber(e.target.value)}
                    placeholder={t.enterTracking || 'Enter tracking number (e.g. TBA...)'}
                    className="flex-1 min-w-[150px] bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPkgShippingCost}
                      onChange={(e) => setNewPkgShippingCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-20 bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white font-mono"
                    />
                  </div>
                  <button
                    onClick={handleAddTracking}
                    disabled={isSubmittingTracking || !newTrackingNumber.trim()}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-semibold px-4 py-2 rounded-xl transition flex items-center"
                  >
                    {isSubmittingTracking ? '...' : (t.save || 'Save')}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingTracking(false);
                      setNewTrackingNumber('');
                    }}
                    disabled={isSubmittingTracking}
                    className="text-slate-400 hover:text-white p-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
