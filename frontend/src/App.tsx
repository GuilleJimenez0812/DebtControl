import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from './services/api';
import type { User, Person } from './types';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { DebtTable } from './components/DebtTable';
import { PurchasesList } from './components/PurchasesList';
import { ShippingPackages } from './components/ShippingPackages';
import { AuthModal } from './components/AuthModal';
import { NewPurchaseModal } from './components/NewPurchaseModal';
import { NewPaymentModal } from './components/NewPaymentModal';
import { Layers, Package, ShoppingBag } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'debts' | 'purchases' | 'shipping'>('debts');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState<boolean>(false);
  const [selectedPersonForPayment, setSelectedPersonForPayment] = useState<Person | null>(null);

  useEffect(() => {
    apiService.getCurrentUser().then((fetchedUser) => {
      setUser(fetchedUser);
    });
  }, []);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: apiService.getDashboardSummary,
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

  const paymentMutation = useMutation({
    mutationFn: apiService.recordPayment,
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        user={user}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onSeedData={() => seedMutation.mutate()}
        isSeeding={seedMutation.isPending}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SummaryCards
          totalOutstanding={summary?.total_outstanding || 0}
          totalJuly26={summary?.total_july_26 || 0}
          totalAugust26={summary?.total_august_26 || 0}
        />

        {/* View Tabs */}
        <div className="flex space-x-2 border-b border-slate-800/80 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'debts'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Debts & Summary</span>
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
            <span>Purchases Detail</span>
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
              activeTab === 'shipping'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Shipping & Packages</span>
          </button>
        </div>

        {isLoading ? (
          <div className="glass-panel p-12 rounded-2xl text-center text-slate-400 animate-pulse">
            Loading DebtControl platform data...
          </div>
        ) : (
          <>
            {activeTab === 'debts' && (
              <DebtTable
                persons={summary?.persons || []}
                onOpenPaymentModal={(person) => setSelectedPersonForPayment(person)}
                onOpenPurchaseModal={() => setIsPurchaseOpen(true)}
              />
            )}

            {activeTab === 'purchases' && (
              <PurchasesList purchases={summary?.recent_purchases || []} />
            )}

            {activeTab === 'shipping' && (
              <ShippingPackages packages={summary?.shipping_packages || []} />
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

      <NewPurchaseModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
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
