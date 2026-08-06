export type PersonStatus = 'Pending' | 'Paid';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  name: string;
  total_owed: number;
  total_paid: number;
  balance: number;
  status: PersonStatus;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  person_id: string;
  person_name: string;
  order_number: string;
  description: string;
  item_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total_cost: number;
  detail_period: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  person_id: string;
  amount_paid: number;
  notes: string;
  payment_date: string;
}

export interface ShippingPackage {
  id: string;
  order_number: string;
  tracking_number: string;
  shipping_cost: number;
  item_description: string;
  warehouse_received: boolean;
  dispatch_date: string;
  batch_month: string;
  created_at: string;
}

export interface DashboardSummary {
  total_outstanding: number;
  total_july_26: number;
  total_august_26: number;
  persons: Person[];
  recent_purchases: PurchaseItem[];
  shipping_packages: ShippingPackage[];
}
