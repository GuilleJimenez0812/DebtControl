import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from './services/api';
import type { User, Person, PurchaseItem } from './types';
import type { Language } from './i18n/translations';
import { translations } from './i18n/translations';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { DebtTable } from './components/DebtTable';
import { PurchasesList } from './components/PurchasesList';
import { PurchaseDetailModal } from './components/PurchaseDetailModal';
import { AuthModal } from './components/AuthModal';
import { AuthWall } from './components/AuthWall';
import { NewPurchaseModal } from './components/NewPurchaseModal';
import { NewPaymentModal } from './components/NewPaymentModal';
import { AdminUserModal } from './components/AdminUserModal';
import { UploadInvoiceModal } from './components/UploadInvoiceModal';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { SearchBar } from './components/SearchBar';
import { Layers, ShoppingBag } from 'lucide-react';

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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('debtcontrol_lang', newLang);
  };

  const [activeTab, setActiveTab] = useState<'debts' | 'purchases'>('debts');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('All');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('All');

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
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
      <Navbar
        user={user}
        language={language}
        onLanguageChange={handleLanguageChange}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenAdminModal={() => setIsAdminOpen(true)}
        onOpenUploadInvoiceModal={() => setIsUploadInvoiceOpen(true)}
        onLogout={handleLogout}
        onSeedData={() => seedMutation.mutate()}
        isSeeding={seedMutation.isPending}
      />

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

            {/* View Tabs */}
            <div className="flex space-x-2 border-b border-slate-800/80 mb-6 pb-2 mt-2">
              <button
                onClick={() => setActiveTab('debts')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                  activeTab === 'debts'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>{t.debtsTab}</span>
              </button>

              <button
                onClick={() => setActiveTab('purchases')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                  activeTab === 'purchases'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                  <PurchasesList
                    purchases={summary?.recent_purchases || []}
                    language={language}
                    selectedPersonFilter={selectedPersonFilter}
                    onPersonFilterChange={setSelectedPersonFilter}
                    selectedPeriodFilter={selectedPeriodFilter}
                    onPeriodFilterChange={setSelectedPeriodFilter}
                    onSelectPurchase={(item) => setSelectedPurchaseForModal(item)}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      <AuthModal
        isOpen={isAuthOpen}
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
      />

      <NewPaymentModal
        person={selectedPersonForPayment}
        isOpen={!!selectedPersonForPayment}
        onClose={() => setSelectedPersonForPayment(null)}
        onSubmit={async (payload) => {
          await paymentMutation.mutateAsync(payload);
        }}
      />

      <PurchaseDetailModal
        purchase={selectedPurchaseForModal}
        packages={summary?.shipping_packages || []}
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
      />
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
