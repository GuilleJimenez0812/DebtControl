import axios from 'axios';
import type { DashboardSummary, User } from '../types';

const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Auth
  register: async (email: string, password: string, fullName: string) => {
    const response = await apiClient.post('/auth/register', { email, password, full_name: fullName });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post<{ user: User; access_token: string }>('/auth/login', { email, password });
    if (response.data.access_token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
    }
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
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

  recordPayment: async (payload: { person_id: string; amount_paid: number; notes: string }) => {
    const response = await apiClient.post('/debts/payments', payload);
    return response.data;
  },

  seedData: async () => {
    const response = await apiClient.post('/debts/seed');
    return response.data;
  },
};
