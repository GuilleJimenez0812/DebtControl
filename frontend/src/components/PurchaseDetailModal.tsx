import React, { useState, useEffect } from 'react';
import type { PurchaseItem, ShippingPackage, Person } from '../types';
import type { Language } from '../i18n/translations';
import { translations } from '../i18n/translations';
import { FileText, Edit2, Save, Package, Eye, UserCog, Trash2, Plus } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface PurchaseDetailModalProps {
  purchase: PurchaseItem | null;
  packages: ShippingPackage[];
  persons?: Person[];
  isOpen: boolean;
  language: Language;
  userRole?: string;
  onClose: () => void;
  onOpenPreviewInvoice?: (url: string) => void;
  onUpdatePurchase: (id: string, payload: { item_amount: number; tax_amount: number; shipping_cost: number; invoice_url?: string }) => Promise<void>;
  onUpdatePackage: (id: string, payload: { shipping_cost: number; warehouse_received: boolean; personally_received: boolean; dispatch_date: string }) => Promise<void>;
  onCreatePackage?: (purchaseId: string, trackingNumber: string, shippingCost: number) => Promise<void>;
  onReassignPurchase?: (purchaseId: string, personId: string) => Promise<void>;
  onDeletePurchase?: (purchaseId: string) => Promise<void>;
}

const money = (n: number) => `$${n.toFixed(2)}`;

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  purchase,
  packages,
  persons,
  isOpen,
  language,
  userRole,
  onClose,
  onOpenPreviewInvoice,
  onUpdatePurchase,
  onUpdatePackage,
  onCreatePackage,
  onReassignPurchase,
  onDeletePurchase,
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

  const [isReassigning, setIsReassigning] = useState<boolean>(false);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');

  useEffect(() => {
    if (isOpen && purchase) {
      setItemAmount(purchase.item_amount);
      setTaxAmount(purchase.tax_amount);
      setShippingCost(purchase.shipping_cost);
      setInvoiceUrl(purchase.invoice_url || '');
      setIsEditingPurchase(false);
      setEditingPkgId(null);
      setIsAddingTracking(false);
      setIsReassigning(false);
      setShowDeleteConfirm(false);
      setActionError('');
    }
  }, [isOpen, purchase]);

  if (!isOpen || !purchase) return null;

  const relatedPackages = packages.filter(
    (pkg) => pkg.order_number === purchase.order_number || (purchase.description && pkg.item_description && pkg.item_description.includes(purchase.description))
  );

  const attachedInvoices = purchase.invoice_url
    ? purchase.invoice_url.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const originalPerson = persons?.find((p) => p.id === purchase.person_id);
  const hasRecordedPayments = (originalPerson?.total_paid ?? 0) > 0;
  const reassignCandidates = (persons || []).filter((p) => p.id !== purchase.person_id);

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

  const handleReassign = async () => {
    if (!reassignTargetId || !onReassignPurchase) return;
    setIsSubmittingReassign(true);
    setActionError('');
    try {
      await onReassignPurchase(purchase.id, reassignTargetId);
      setReassignTargetId('');
      setIsReassigning(false);
    } catch (error) {
      console.error("Failed to reassign order:", error);
      setActionError(t.reassignFailed);
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeletePurchase) return;
    setIsSubmittingDelete(true);
    setActionError('');
    try {
      await onDeletePurchase(purchase.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete order:", error);
      setActionError(t.deleteFailed);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      width="lg"
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent/10 text-accent dark:bg-accent/20">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-ink dark:text-ink-dark">{purchase.description}</h3>
            <p className="text-xs text-ink-tertiary font-mono dark:text-ink-tertiary-dark">
              {language === 'es' ? 'Orden' : 'Order'}: {purchase.order_number || 'N/A'} • {t.person}: <span className="font-semibold text-accent">{purchase.person_name}</span>
            </p>
          </div>
        </div>
      }
    >
      {/* Purchase Amounts */}
      <div className="rounded-2xl border border-line bg-panel p-4 mb-6 dark:border-line-dark dark:bg-panel">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">
            {language === 'es' ? 'Desglose de Costos y Factura' : 'Cost Breakdown & Invoice'}
          </span>
          {isAdmin &&
            (!isEditingPurchase ? (
              <button
                onClick={() => {
                  setItemAmount(purchase.item_amount);
                  setTaxAmount(purchase.tax_amount);
                  setShippingCost(purchase.shipping_cost);
                  setInvoiceUrl(purchase.invoice_url || '');
                  setIsEditingPurchase(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover dark:hover:text-accent-hover-dark"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>{language === 'es' ? 'Editar montos' : 'Edit amounts'}</span>
              </button>
            ) : (
              <Button size="sm" variant="success" onClick={handleSavePurchase}>
                <Save className="h-3.5 w-3.5" />
                <span>{t.saveChanges}</span>
              </Button>
            ))}
        </div>

        {!isEditingPurchase ? (
          <div className="grid grid-cols-4 gap-3 border-t border-line pt-3 text-center dark:border-line-dark">
            <div>
              <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.itemAmount}</p>
              <p className="font-mono tabular-nums text-sm font-bold text-ink dark:text-ink-dark">{money(purchase.item_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.taxAmount}</p>
              <p className="font-mono tabular-nums text-sm font-bold text-ink-secondary dark:text-ink-secondary-dark">{money(purchase.tax_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.shippingCost}</p>
              <p className="font-mono tabular-nums text-sm font-bold text-ink-secondary dark:text-ink-secondary-dark">{money(purchase.shipping_cost)}</p>
            </div>
            <div className="rounded-xl bg-accent/10 p-2">
              <p className="text-xs font-semibold text-accent">{t.totalCost}</p>
              <p className="font-mono tabular-nums text-base font-extrabold text-accent">{money(purchase.total_cost)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="mb-1 block text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.itemAmount}</label>
              <Input type="number" step="0.01" value={itemAmount} onChange={(e) => setItemAmount(parseFloat(e.target.value) || 0)} className="w-full font-mono" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.taxAmount}</label>
              <Input type="number" step="0.01" value={taxAmount} onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)} className="w-full font-mono" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.shippingCost}</label>
              <div className="relative">
                <Input type="number" step="0.01" value={shippingCost} disabled className="w-full font-mono opacity-60" />
                <Package className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
              </div>
            </div>
          </div>
        )}

        {/* Invoice PDF Section */}
        <div className="mt-4 space-y-2 border-t border-line pt-3 text-xs dark:border-line-dark">
          <span className="flex items-center gap-1.5 font-semibold text-ink-secondary dark:text-ink-secondary-dark">
            <FileText className="h-4 w-4 text-accent" />
            <span>{t.invoicePdf}</span>
          </span>

          {attachedInvoices.length === 0 ? (
            <p className="italic text-ink-muted dark:text-ink-muted-dark">{t.noInvoice}</p>
          ) : (
            <div className="space-y-1.5">
              {attachedInvoices.map((invUrl, index) => {
                const cleanName = invUrl.startsWith('blob:')
                  ? `Factura_${purchase.order_number || 'Pedido'}.pdf`
                  : invUrl.split('/').pop() || invUrl;

                return (
                  <div key={index} className="flex items-center justify-between rounded-xl border border-line bg-black/[0.02] p-2.5 dark:border-line-dark dark:bg-white/[0.03]">
                    <span className="max-w-[280px] truncate font-mono text-xs text-ink-secondary dark:text-ink-secondary-dark" title={cleanName}>
                      {cleanName}
                    </span>
                    {onOpenPreviewInvoice && (
                      <Button size="sm" variant="secondary" onClick={() => onOpenPreviewInvoice(invUrl)}>
                        <Eye className="h-3.5 w-3.5 text-accent" />
                        <span>{language === 'es' ? 'Ver Factura' : 'View Invoice'}</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Shipping Packages Tracking */}
      <div className="mb-6 space-y-3">
        <h4 className="text-sm font-bold text-ink dark:text-ink-dark">
          {language === 'es' ? 'Registros de Envío' : 'Package Tracking Records'}
        </h4>

        {relatedPackages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs italic text-ink-muted dark:border-line-dark dark:text-ink-muted-dark">
            {language === 'es' ? 'Sin registros de tracking para esta orden.' : 'No tracking records associated with this order number.'}
          </p>
        ) : (
          relatedPackages.map((pkg) => {
            const isPkgEditing = editingPkgId === pkg.id;

            return (
              <div key={pkg.id} className="rounded-2xl border border-line bg-panel p-4 text-xs dark:border-line-dark dark:bg-panel">
                <div className="flex items-center justify-between">
                  <Badge tone="accent" className="font-mono">
                    {pkg.tracking_number || 'No Tracking ID'}
                  </Badge>
                  {isAdmin &&
                    (!isPkgEditing ? (
                      <button
                        onClick={() => handleStartEditPackage(pkg)}
                        className="flex items-center gap-1 font-semibold text-accent hover:text-accent-hover dark:hover:text-accent-hover-dark"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>{language === 'es' ? 'Actualizar' : 'Update'}</span>
                      </button>
                    ) : (
                      <Button size="sm" variant="success" onClick={() => handleSavePackage(pkg.id)}>
                        <Save className="h-3.5 w-3.5" />
                        <span>{t.saveChanges}</span>
                      </Button>
                    ))}
                </div>

                {!isPkgEditing ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-ink-secondary sm:grid-cols-4 dark:text-ink-secondary-dark">
                    <div>
                      <span className="block text-ink-tertiary dark:text-ink-tertiary-dark">{language === 'es' ? 'Costo Envío' : 'Shipping Cost'}:</span>
                      <span className="font-mono tabular-nums font-bold text-ink dark:text-ink-dark">{money(pkg.shipping_cost)}</span>
                    </div>
                    <div>
                      <span className="block text-ink-tertiary dark:text-ink-tertiary-dark">{language === 'es' ? 'Almacén' : 'Warehouse'}:</span>
                      <span className={pkg.warehouse_received ? 'font-semibold text-success' : 'text-ink-muted dark:text-ink-muted-dark'}>
                        {pkg.warehouse_received ? (language === 'es' ? '✓ Recibido' : '✓ Received') : (language === 'es' ? 'Pendiente' : 'Pending')}
                      </span>
                    </div>
                    <div>
                      <span className="block text-ink-tertiary dark:text-ink-tertiary-dark">{language === 'es' ? 'Personal' : 'Personally'}:</span>
                      <span className={pkg.personally_received ? 'font-semibold text-success' : 'text-ink-muted dark:text-ink-muted-dark'}>
                        {pkg.personally_received ? (language === 'es' ? '✓ Recibido' : '✓ Received') : (language === 'es' ? 'Pendiente' : 'Pending')}
                      </span>
                    </div>
                    <div>
                      <span className="block text-ink-tertiary dark:text-ink-tertiary-dark">{language === 'es' ? 'Vuelo Salida' : 'Dispatch Flight'}:</span>
                      <span className="text-ink dark:text-ink-dark">{pkg.dispatch_date || 'N/A'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-ink-tertiary dark:text-ink-tertiary-dark">{language === 'es' ? 'Costo Envío ($)' : 'Shipping Cost ($)'}</label>
                        <Input type="number" step="0.01" value={pkgShippingCost} onChange={(e) => setPkgShippingCost(parseFloat(e.target.value) || 0)} className="w-full font-mono" />
                      </div>
                      <div>
                        <label className="mb-1 block text-ink-tertiary dark:text-ink-tertiary-dark">{language === 'es' ? 'Fecha Vuelo Salida' : 'Dispatch Flight Date'}</label>
                        <Input type="text" value={pkgDispatchDate} onChange={(e) => setPkgDispatchDate(e.target.value)} placeholder="e.g. Viernes 17" className="w-full" />
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="flex cursor-pointer items-center gap-2 text-ink-secondary dark:text-ink-secondary-dark">
                        <input type="checkbox" checked={pkgWarehouse} onChange={(e) => setPkgWarehouse(e.target.checked)} className="accent-accent rounded" />
                        <span>{t.warehouseReceived}</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-ink-secondary dark:text-ink-secondary-dark">
                        <input type="checkbox" checked={pkgPersonally} onChange={(e) => setPkgPersonally(e.target.checked)} className="accent-success rounded" />
                        <span>{t.personallyReceived}</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Add Tracking */}
        {isAdmin && (
          <div className="border-t border-line pt-4 dark:border-line-dark">
            {!isAddingTracking ? (
              <Button size="sm" variant="secondary" onClick={() => setIsAddingTracking(true)}>
                <Plus className="h-3.5 w-3.5 text-accent" />
                <span>{t.addTracking}</span>
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="text"
                  value={newTrackingNumber}
                  onChange={(e) => setNewTrackingNumber(e.target.value)}
                  placeholder={t.enterTracking}
                  className="min-w-[150px] flex-1 font-mono"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-ink-muted dark:text-ink-muted-dark">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPkgShippingCost}
                    onChange={(e) => setNewPkgShippingCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-20 font-mono"
                  />
                </div>
                <Button size="sm" onClick={handleAddTracking} disabled={isSubmittingTracking || !newTrackingNumber.trim()}>
                  {isSubmittingTracking ? t.saving : t.save}
                </Button>
                <button
                  onClick={() => {
                    setIsAddingTracking(false);
                    setNewTrackingNumber('');
                  }}
                  disabled={isSubmittingTracking}
                  className="p-2 text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
                >
                  <span className="h-4 w-4">✕</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Admin: Reassign & Delete */}
        {isAdmin && (
          <div className="mt-6 space-y-3 border-t border-line pt-4 dark:border-line-dark">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary dark:text-ink-tertiary-dark">{t.adminCorrections}</h4>

            {actionError && (
              <p className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">{actionError}</p>
            )}

            {!isReassigning ? (
              <Button size="sm" variant="secondary" onClick={() => setIsReassigning(true)}>
                <UserCog className="h-3.5 w-3.5 text-accent" />
                <span>{t.reassign}</span>
              </Button>
            ) : (
              <div className="rounded-2xl border border-line bg-panel p-4 space-y-3 dark:border-line-dark dark:bg-panel">
                <div>
                  <label className="mb-1 block text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.reassignAction}</label>
                  <select
                    value={reassignTargetId}
                    onChange={(e) => setReassignTargetId(e.target.value)}
                    className="w-full rounded-[8px] border border-line bg-panel px-3 py-2 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/40 dark:border-line-dark dark:bg-panel-dark dark:text-ink-dark"
                  >
                    <option value="">{t.selectPersonPlaceholder}</option>
                    {reassignCandidates.map((person) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                </div>

                {hasRecordedPayments && (
                  <p className="rounded-xl border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">{t.paymentsStayWarning}</p>
                )}

                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleReassign} disabled={isSubmittingReassign || !reassignTargetId}>
                    {isSubmittingReassign ? t.reassigning : t.reassignAction}
                  </Button>
                  <button
                    onClick={() => {
                      setIsReassigning(false);
                      setReassignTargetId('');
                    }}
                    disabled={isSubmittingReassign}
                    className="p-2 text-xs text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}

            {!showDeleteConfirm ? (
              <Button size="sm" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t.deleteOrder}</span>
              </Button>
            ) : (
              <div className="space-y-3 rounded-2xl border border-danger/30 bg-panel p-4 dark:bg-panel-dark">
                <p className="text-xs font-bold text-danger">{t.deleteOrderConfirmTitle}</p>
                <p className="text-xs text-ink-tertiary dark:text-ink-tertiary-dark">{t.deleteOrderConfirmBody}</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="danger" onClick={handleDelete} disabled={isSubmittingDelete}>
                    {isSubmittingDelete ? t.deleting : t.confirmDelete}
                  </Button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSubmittingDelete}
                    className="p-2 text-xs text-ink-muted hover:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};