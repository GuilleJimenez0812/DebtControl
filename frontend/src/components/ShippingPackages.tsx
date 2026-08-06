import React from 'react';
import type { ShippingPackage } from '../types';
import { Truck, CheckCircle2, AlertCircle, Plane } from 'lucide-react';

interface ShippingPackagesProps {
  packages: ShippingPackage[];
}

export const ShippingPackages: React.FC<ShippingPackagesProps> = ({ packages }) => {
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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Order Number</th>
              <th className="py-3 px-4">Tracking ID</th>
              <th className="py-3 px-4">Item Description</th>
              <th className="py-3 px-4">Shipping Cost</th>
              <th className="py-3 px-4">Warehouse Status</th>
              <th className="py-3 px-4">Dispatch Flight</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                  {pkg.order_number}
                </td>
                <td className="py-3.5 px-4 font-mono text-xs text-indigo-300">
                  {pkg.tracking_number || 'N/A'}
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-200">
                  {pkg.item_description}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-300">
                  ${pkg.shipping_cost.toFixed(2)}
                </td>
                <td className="py-3.5 px-4">
                  {pkg.warehouse_received ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Received</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>In Transit</span>
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-300">
                  {pkg.dispatch_date ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      <Plane className="w-3.5 h-3.5" />
                      <span>{pkg.dispatch_date}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
