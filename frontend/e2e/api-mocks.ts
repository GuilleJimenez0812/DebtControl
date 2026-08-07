import type { Page } from '@playwright/test';

export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const mockUser: MockUser = {
  id: 'user-1',
  email: 'admin@debtcontrol.dev',
  full_name: 'Ana Pérez',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const persons = [
  { id: 'p1', name: 'Carlos Gómez', total_owed: 1250.5, total_paid: 300, balance: 950.5, status: 'Pending', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
  { id: 'p2', name: 'María Fernández', total_owed: 720.25, total_paid: 720.25, balance: 0, status: 'Paid', created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' },
  { id: 'p3', name: 'Luis Rodríguez', total_owed: 3006, total_paid: 1000, balance: 2006, status: 'Pending', created_at: '2026-01-04T00:00:00Z', updated_at: '2026-01-04T00:00:00Z' },
];

const recents = [
  { id: 'r1', person_id: 'p1', person_name: 'Carlos Gómez', order_number: 'ORD-2026-0001', description: 'Zapatos deportivos talla 42', item_amount: 1200, tax_amount: 50.5, shipping_cost: 25, total_cost: 1275.5, detail_period: 'July 2026', invoice_url: '/api/v1/invoices/r1.pdf', created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: 'r2', person_id: 'p2', person_name: 'María Fernández', order_number: 'COMP-2026-0002', description: 'Chaqueta de cuero', item_amount: 800, tax_amount: 160, shipping_cost: 40, total_cost: 1000, detail_period: 'July 2026', created_at: '2026-07-05T00:00:00Z', updated_at: '2026-07-05T00:00:00Z' },
  { id: 'r3', person_id: 'p3', person_name: 'Luis Rodríguez', order_number: 'COMP-2026-0003', description: 'Reloj inteligente con correa extra larga', item_amount: 2600, tax_amount: 520, shipping_cost: 60, total_cost: 3180, detail_period: 'August 2026', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
];

const packages = [
  { id: 'pk1', purchase_item_id: 'r1', order_number: 'COMP-2026-0001', tracking_number: 'BRD-81923456789', shipping_cost: 80, item_description: 'Zapatillas deportivas', warehouse_received: true, personally_received: false, dispatch_date: '2026-07-15', batch_month: 'July 2026', created_at: '2026-07-10T00:00:00Z', updated_at: '2026-07-15T00:00:00Z' },
];

const summary = {
  total_outstanding: 2956.5,
  total_july_26: 2275.5,
  total_august_26: 3180,
  persons,
  recent_purchases: recents,
  shipping_packages: packages,
};

export async function mockApi(page: Page): Promise<void> {
  // Catch-all first: Playwright evaluates routes newest-first, so specific
  // routes registered afterwards win for their paths.
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: mockUser }) }),
  );
  await page.route('**/api/v1/debts/summary', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(summary) }),
  );
  await page.route('**/api/v1/admin/users', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ users: [] }) }),
  );
}