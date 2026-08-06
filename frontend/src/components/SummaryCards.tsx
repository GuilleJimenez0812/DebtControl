import React from 'react';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface SummaryCardsProps {
  totalOutstanding: number;
  totalJuly26: number;
  totalAugust26: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalOutstanding,
  totalJuly26,
  totalAugust26,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Outstanding Balance */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Outstanding Balance (Saldo Pendiente)
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              ${totalOutstanding.toFixed(2)}
            </h3>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Total July 26 */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Total July 2026 (Julio-26)
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              ${totalJuly26.toFixed(2)}
            </h3>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Total August 26 */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
              Total August 2026 (Agosto-26)
            </p>
            <h3 className="text-3xl font-extrabold text-white mt-2">
              ${totalAugust26.toFixed(2)}
            </h3>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
