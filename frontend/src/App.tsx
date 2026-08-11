import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from './services/api';
import type { User, Person, PurchaseItem } from './types';
import type { Language } from './i18n/translations';
import { translations } from './i18n/translations';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar, type NavKey } from './components/layout/Sidebar';
import { SummaryCards } from './components/SummaryCards';
import { DebtTable } from './components/DebtTable';
import { PurchasesList } from './components/PurchasesList';
import { ShippingPackages } from './components/ShippingPackages';
import { PurchaseDetailModal } from './components/PurchaseDetailModal';
import { AuthModal } from './components/AuthModal';
import { AuthWall } from './components/AuthWall';
import { NewPurchaseModal } from './components/NewPurchaseModal';
import { NewPaymentModal } from './components/NewPaymentModal';
import { AdminUserModal } from './components/AdminUserModal';
import { AuditLogsModal } from './components/AuditLogsModal';
import { UploadInvoiceModal } from './components/UploadInvoiceModal';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { SearchBar } from './components/SearchBar';
import { Layers, ShoppingBag, X } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const DashboardContent: React.FC = () => {
  const queryClientInstance = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem('debtcontrol_lang');
    return (savedLang === 'en' || savedLang === 'es') ? savedLang : 'es';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('debtcontrol_dark');
    return saved === null ? false : saved === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('debtcontrol_dark', String(isDarkMode));
  }, [isDarkMode]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('debtcontrol_lang', newLang);
  };

  const handleSidebarNavigate = (key: NavKey) => {
    if (key === 'debts' || key === 'purchases') {
      setActiveTab(key);
    } else if (key === 'payments') {
      setActiveTab('debts');
      document.getElementById('debt-actions')?.scrollIntoView({ behavior: 'smooth' });
    } else if (key === 'invoices') {
      setIsUploadInvoiceOpen(true);
    }
  };

  const [activeTab, setActiveTab] = useState<'debts' | 'purchases'>('debts');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('All');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('All');

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState<boolean>(false);
  const [isUploadInvoiceOpen, setIsUploadInvoiceOpen] = useState<boolean>(false);
  const [previewInvoiceUrl, setPreviewInvoiceUrl] = useState<string | null>(null);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState<boolean>(false);
  const [selectedPersonForPayment, setSelectedPersonForPayment] = useState<Person | null>(null);
  const [selectedPurchaseForModal, setSelectedPurchaseForModal] = useState<PurchaseItem | null>(null);

  const t = translations[language];

  useEffect(() => {
    document.title = t.appTitle;
  }, [language, t.appTitle]);

  useEffect(() => {
    apiService.getCurrentUser().then((fetchedUser) => {
      setUser(fetchedUser);
    });
  }, []);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: apiService.getDashboardSummary,
    enabled: !!user,
  });

  const { data: adminUsers, refetch: refetchAdminUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: apiService.getAdminUsers,
    enabled: !!user && user.role === 'admin',
  });

  const seedMutation = useMutation({
    mutationFn: apiService.seedData,
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: apiService.createPurchase,
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { item_amount: number; tax_amount: number; shipping_cost: number; invoice_url?: string } }) =>
      apiService.updatePurchase(id, payload),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const reassignPurchaseMutation = useMutation({
    mutationFn: ({ id, personId }: { id: string; personId: string }) =>
      apiService.reassignPurchase(id, personId),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setSelectedPurchaseForModal(null);
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: (id: string) => apiService.deletePurchase(id),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setSelectedPurchaseForModal(null);
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: ({ purchaseId, trackingNumber, shippingCost }: { purchaseId: string; trackingNumber: string; shippingCost: number }) =>
      apiService.createPackage(purchaseId, trackingNumber, shippingCost),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { shipping_cost: number; warehouse_received: boolean; personally_received: boolean; dispatch_date: string } }) =>
      apiService.updatePackage(id, payload),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: apiService.recordPayment,
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const createAdminUserMutation = useMutation({
    mutationFn: apiService.createAdminUser,
    onSuccess: () => {
      refetchAdminUsers();
    },
  });

  const assignUserPersonsMutation = useMutation({
    mutationFn: ({ userId, personIds }: { userId: string; personIds: string[] }) =>
      apiService.assignUserPersons(userId, personIds),
    onSuccess: () => {
      refetchAdminUsers();
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const confirmAttachInvoiceMutation = useMutation({
    mutationFn: ({ purchaseId, invoiceFilename, mode }: { purchaseId: string; invoiceFilename: string; mode: 'replace' | 'append' }) =>
      apiService.confirmAttachInvoice(purchaseId, invoiceFilename, mode),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleSearchResultSelect = (purchaseId: string) => {
    if (summary && summary.recent_purchases) {
      const purchase = summary.recent_purchases.find(p => p.id === purchaseId);
      if (purchase) {
        setSelectedPurchaseForModal(purchase);
      }
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    const result = await apiService.login(email, pass);
    setUser(result.user);
    refetch();
  };

  const handleRegister = async (email: string, pass: string, name: string) => {
    await apiService.register(email, pass, name);
    await handleLogin(email, pass);
  };

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const handleSelectPersonFromSummary = (personName: string) => {
    setSelectedPersonFilter(personName);
    setActiveTab('purchases');
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <TitleBar
        user={user}
        language={language}
        onLanguageChange={handleLanguageChange}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenAdminModal={() => setIsAdminOpen(true)}
        onOpenAuditLogsModal={() => setIsAuditLogsOpen(true)}
        onOpenUploadInvoiceModal={() => setIsUploadInvoiceOpen(true)}
        onOpenSecurityModal={() => {}}
        onLogout={handleLogout}
        onOpenMenu={() => setDrawerOpen(true)}
        onSeedData={() => seedMutation.mutate()}
        isSeeding={seedMutation.isPending}
      />

      <div className="flex max-w-[2000px] w-full mx-auto">
        <aside className="sticky top-11 hidden lg:block h-[calc(100vh-44px)] w-56 shrink-0 mac-vibrancy mac-vibrancy-light dark:mac-vibrancy border-r border-line dark:border-line-dark">
          <Sidebar
            active={activeTab as NavKey}
            onNavigate={handleSidebarNavigate}
            isAdmin={user?.role === 'admin'}
            onOpenAdminModal={() => setIsAdminOpen(true)}
            onOpenAuditLogsModal={() => setIsAuditLogsOpen(true)}
            onOpenUploadInvoiceModal={() => setIsUploadInvoiceOpen(true)}
          />
        </aside>

        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!user ? (
            <AuthWall language={language} onOpenAuthModal={() => setIsAuthOpen(true)} />
          ) : (
            <>
              <SummaryCards
                persons={summary?.persons || []}
                totalOutstanding={summary?.total_outstanding || 0}
                language={language}
                selectedPersonFilter={selectedPersonFilter}
                onSelectPersonFilter={handleSelectPersonFromSummary}
              />

              <SearchBar language={language} onSelectResult={handleSearchResultSelect} />
              <div className="flex space-x-2 border-b border-line dark:border-line-dark mb-6 pb-2 mt-2">
                <button
                  onClick={() => setActiveTab('debts')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                    activeTab === 'debts'
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'text-ink-muted hover:text-ink hover:bg-black/5 dark:text-ink-muted-dark dark:hover:text-ink-dark dark:hover:bg-white/10'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{t.debtsTab}</span>
                </button>

                <button
                  onClick={() => setActiveTab('purchases')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                    activeTab === 'purchases'
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'text-ink-muted hover:text-ink hover:bg-black/5 dark:text-ink-muted-dark dark:hover:text-ink-dark dark:hover:bg-white/10'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t.purchasesTab}</span>
                </button>
              </div>

              {isLoading ? (
                <div className="glass-panel p-12 rounded-3xl text-center text-slate-400 animate-pulse">
                  Loading DebtControl platform data...
                </div>
              ) : (
                <>
                  {activeTab === 'debts' && (
                    <DebtTable
                      persons={summary?.persons || []}
                      language={language}
                      userRole={user?.role}
                      onOpenPaymentModal={(person) => setSelectedPersonForPayment(person)}
                      onOpenPurchaseModal={() => setIsPurchaseOpen(true)}
                      onSelectPersonFilter={handleSelectPersonFromSummary}
                    />
                  )}

                  {activeTab === 'purchases' && (
                    <>
                      <PurchasesList
                        purchases={summary?.recent_purchases || []}
                        language={language}
                        selectedPersonFilter={selectedPersonFilter}
                        onPersonFilterChange={setSelectedPersonFilter}
                        selectedPeriodFilter={selectedPeriodFilter}
                        onPeriodFilterChange={setSelectedPeriodFilter}
                        onSelectPurchase={(item) => setSelectedPurchaseForModal(item)}
                      />
<ShippingPackages packages={summary?.shipping_packages || []} language={language} />
                    </>
                  )}
                </>
              )}
            </>
          )}
      </main>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 mac-vibrancy mac-vibrancy-light dark:mac-vibrancy border-r border-line dark:border-line-dark shadow-2xl">
            <div className="flex h-11 items-center justify-between border-b border-line dark:border-line-dark px-4">
              <span className="text-[13px] font-semibold text-ink dark:text-ink-dark">DebtControl</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-muted hover:bg-black/5 dark:text-ink-muted-dark dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar
              active={activeTab as NavKey}
              onNavigate={(key) => {
                handleSidebarNavigate(key);
                setDrawerOpen(false);
              }}
              isAdmin={user?.role === 'admin'}
              onOpenAdminModal={() => {
                setIsAdminOpen(true);
                setDrawerOpen(false);
              }}
              onOpenAuditLogsModal={() => {
                setIsAuditLogsOpen(true);
                setDrawerOpen(false);
              }}
              onOpenUploadInvoiceModal={() => {
                setIsUploadInvoiceOpen(true);
                setDrawerOpen(false);
              }}
            />
          </aside>
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        language={language}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <AdminUserModal
        isOpen={isAdminOpen}
        usersWithPersons={adminUsers || []}
        allPersons={summary?.persons || []}
        onClose={() => setIsAdminOpen(false)}
        onCreateUser={async (payload) => {
          await createAdminUserMutation.mutateAsync(payload);
        }}
        onAssignPersons={async (userId, personIds) => {
          await assignUserPersonsMutation.mutateAsync({ userId, personIds });
        }}
      />

      <AuditLogsModal
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
        language={language}
      />

      <UploadInvoiceModal
        isOpen={isUploadInvoiceOpen}
        persons={summary?.persons || []}
        language={language}
        onClose={() => setIsUploadInvoiceOpen(false)}
        onOpenPreviewInvoice={(url) => setPreviewInvoiceUrl(url)}
        onUpload={async (file) => {
          const res = await apiService.uploadInvoice(file);
          return res;
        }}
        onConfirmAttach={async (purchaseId, invoiceFilename, mode) => {
          await confirmAttachInvoiceMutation.mutateAsync({ purchaseId, invoiceFilename, mode });
        }}
        onCreatePurchase={async (payload) => {
          await purchaseMutation.mutateAsync(payload);
        }}
      />

      <InvoicePreviewModal
        isOpen={!!previewInvoiceUrl}
        invoiceUrl={previewInvoiceUrl}
        orderNumber={selectedPurchaseForModal?.order_number}
        language={language}
        onClose={() => setPreviewInvoiceUrl(null)}
      />

      <NewPurchaseModal
        isOpen={isPurchaseOpen}
        language={language}
        persons={summary?.persons || []}
        onClose={() => setIsPurchaseOpen(false)}
        onUploadInvoice={apiService.uploadInvoice}
        onSubmit={async (payload) => {
          await purchaseMutation.mutateAsync(payload);
        }}
        onAfterSave={(personName) => {
          const person = (summary?.persons || []).find((p) => p.name === personName);
          if (person) setSelectedPersonForPayment(person);
        }}
      />

      <NewPaymentModal
        person={selectedPersonForPayment}
        isOpen={!!selectedPersonForPayment}
        language={language}
        onClose={() => setSelectedPersonForPayment(null)}
        onSubmit={async (payload) => {
          await paymentMutation.mutateAsync(payload);
        }}
      />

      <PurchaseDetailModal
        purchase={selectedPurchaseForModal}
        packages={summary?.shipping_packages || []}
        persons={summary?.persons || []}
        isOpen={!!selectedPurchaseForModal}
        language={language}
        userRole={user?.role}
        onClose={() => setSelectedPurchaseForModal(null)}
        onOpenPreviewInvoice={(url) => setPreviewInvoiceUrl(url)}
        onUpdatePurchase={async (id, payload) => {
          await updatePurchaseMutation.mutateAsync({ id, payload });
          setSelectedPurchaseForModal((prev) => (prev ? { ...prev, ...payload, total_cost: payload.item_amount + payload.tax_amount + payload.shipping_cost } : null));
        }}
        onUpdatePackage={async (id, payload) => {
          await updatePackageMutation.mutateAsync({ id, payload });
        }}
        onCreatePackage={async (purchaseId, trackingNumber, shippingCost) => {
          await createPackageMutation.mutateAsync({ purchaseId, trackingNumber, shippingCost });
        }}
        onReassignPurchase={async (purchaseId, personId) => {
          await reassignPurchaseMutation.mutateAsync({ id: purchaseId, personId });
        }}
        onDeletePurchase={async (purchaseId) => {
          await deletePurchaseMutation.mutateAsync(purchaseId);
        }}
      />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
};

export default App;
