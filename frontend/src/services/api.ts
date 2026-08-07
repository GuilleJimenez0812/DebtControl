import axios from 'axios';
import type { DashboardSummary, User, PurchaseItem, ShippingPackage, Person } from '../types';

const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// A short-lived token stored in memory; on each successful auth flow it is
// refreshed from the HttpOnly cookie response. The cookie itself is the
// source of truth for the session.
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Echo the non-HttpOnly double-submit CSRF cookie on every mutation.
apiClient.interceptors.request.use((config) => {
  const csrf = readCookie('csrf_token');
  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original?._retried) {
      original._retried = true;
      try {
        const csrf = readCookie('csrf_token') ?? '';
        await axios.post('/api/v1/auth/refresh', {}, {
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrf },
        });
        return apiClient(original);
      } catch {
        // refresh failed; fall through to surface the original 401
      }
    }
    return Promise.reject(error);
  }
);

export interface UserWithPersons {
  user: User;
  assigned_persons: Person[];
  assigned_person_ids: string[];
}

export interface ParseInvoiceResult {
  order_number: string;
  description: string;
  item_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total_cost: number;
  matched: boolean;
  matched_purchase_item?: PurchaseItem;
}

export const apiService = {
  // Auth
  register: async (email: string, password: string, fullName: string) => {
    const response = await apiClient.post('/auth/register', { email, password, full_name: fullName });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    delete apiClient.defaults.headers.common['Authorization'];
    return response.data;
  },

  logoutEverywhere: async () => {
    const response = await apiClient.post('/auth/logout-everywhere');
    delete apiClient.defaults.headers.common['Authorization'];
    return response.data;
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      return response.data.user;
    } catch {
      return null;
    }
  },

  // Debts
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/debts/summary');
    return response.data;
  },

  createPurchase: async (payload: {
    person_name: string;
    order_number: string;
    description: string;
    item_amount: number;
    tax_amount: number;
    shipping_cost: number;
    detail_period: string;
  }) => {
    const response = await apiClient.post('/debts/purchases', payload);
    return response.data;
  },

  uploadInvoice: async (file: File): Promise<ParseInvoiceResult> => {
    const formData = new FormData();
    formData.append('invoice_file', file);
    const response = await apiClient.post<ParseInvoiceResult>('/debts/purchases/upload-invoice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  confirmAttachInvoice: async (purchaseId: string, invoiceFilename: string, mode: 'replace' | 'append' = 'replace') => {
    const response = await apiClient.post<{ purchase: PurchaseItem }>('/debts/purchases/confirm-invoice', {
      purchase_id: purchaseId,
      invoice_filename: invoiceFilename,
      mode,
    });
    return response.data;
  },

  updatePurchase: async (
    id: string,
    payload: { item_amount: number; tax_amount: number; shipping_cost: number; invoice_url?: string }
  ): Promise<{ purchase: PurchaseItem }> => {
    const response = await apiClient.put<{ purchase: PurchaseItem }>(`/debts/purchases/${id}`, payload);
    return response.data;
  },

  createPackage: async (purchaseId: string, trackingNumber: string, shippingCost: number): Promise<{ package: ShippingPackage }> => {
    const response = await apiClient.post<{ package: ShippingPackage }>(`/debts/purchases/${purchaseId}/packages`, { 
      tracking_number: trackingNumber,
      shipping_cost: shippingCost 
    });
    return response.data;
  },

  reassignPurchase: async (purchaseId: string, personId: string): Promise<{ purchase: PurchaseItem }> => {
    const response = await apiClient.put<{ purchase: PurchaseItem }>(`/debts/purchases/${purchaseId}/person`, {
      person_id: personId,
    });
    return response.data;
  },

  deletePurchase: async (purchaseId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/debts/purchases/${purchaseId}`);
    return response.data;
  },

  updatePackage: async (
    id: string,
    payload: { shipping_cost: number; warehouse_received: boolean; personally_received: boolean; dispatch_date: string }
  ): Promise<{ package: ShippingPackage }> => {
    const response = await apiClient.put<{ package: ShippingPackage }>(`/debts/packages/${id}`, payload);
    return response.data;
  },

  recordPayment: async (payload: { person_id: string; amount_paid: number; notes: string }) => {
    const response = await apiClient.post('/debts/payments', payload);
    return response.data;
  },

  seedData: async () => {
    const response = await apiClient.post('/debts/seed');
    return response.data;
  },

  // Admin User & Person Access Management
  getAdminUsers: async (): Promise<UserWithPersons[]> => {
    const response = await apiClient.get<{ users: UserWithPersons[] }>('/admin/users');
    return response.data.users;
  },

  createAdminUser: async (payload: { email: string; password: string; full_name: string; role: string }) => {
    const response = await apiClient.post('/admin/users', payload);
    return response.data;
  },

  assignUserPersons: async (userId: string, personIds: string[]) => {
    const response = await apiClient.put(`/admin/users/${userId}/persons`, { person_ids: personIds });
    return response.data;
  },

  updateUserPerson: async (userId: string, personId: string): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/person`, { person_id: personId });
  },

  getAuditLogs: async (limit: number = 50, offset: number = 0): Promise<{ logs: any[] }> => {
    const response = await apiClient.get<{ logs: any[] }>(`/admin/audit-logs?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};
