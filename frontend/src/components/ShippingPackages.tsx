import React from 'react';
import type { ShippingPackage } from '../types';
import { ResponsiveTable, type Column } from './ResponsiveTable';
import { Truck, CheckCircle2, AlertCircle, Plane } from 'lucide-react';

interface ShippingPackagesProps {
  packages: ShippingPackage[];
}

export const ShippingPackages: React.FC<ShippingPackagesProps> = ({ packages }) => {
  const columns: Column<ShippingPackage>[] = [
    {
      key: 'order_number',
      header: 'Order Number',
      cardLabel: 'Order Number',
      emphasis: true,
      render: (pkg) => <span className="font-mono text-xs text-slate-300">{pkg.order_number}</span>,
    },
    {
      key: 'tracking',
      header: 'Tracking ID',
      cardLabel: 'Tracking ID',
      render: (pkg) => <span className="font-mono text-xs text-indigo-300">{pkg.tracking_number || 'N/A'}</span>,
    },
    {
      key: 'description',
      header: 'Item Description',
      cardLabel: 'Item',
      render: (pkg) => <span className="font-medium text-slate-200">{pkg.item_description}</span>,
    },
    {
      key: 'cost',
      header: 'Shipping Cost',
      align: 'right',
      cardLabel: 'Shipping Cost',
      render: (pkg) => <span className="font-mono text-slate-300">${pkg.shipping_cost.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Warehouse Status',
      cardLabel: 'Status',
      render: (pkg) =>
        pkg.warehouse_received ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Received</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>In Transit</span>
          </span>
        ),
    },
    {
      key: 'dispatch',
      header: 'Dispatch Flight',
      cardLabel: 'Dispatch Flight',
      render: (pkg) =>
        pkg.dispatch_date ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Plane className="w-3.5 h-3.5" />
            <span>{pkg.dispatch_date}</span>
          </span>
        ) : (
          <span className="text-slate-500 text-xs">Pending</span>
        ),
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            <span>Shipping & Package Tracking (Control de Envíos)</span>
          </h2>
          <p className="text-xs text-slate-400">Air dispatch schedules and warehouse receipt logs</p>
        </div>
      </div>

      <ResponsiveTable rows={packages} rowKey={(pkg) => pkg.id} columns={columns} />
    </div>
  );
};