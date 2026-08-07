import React from 'react';

/**
 * ResponsiveTable — deep module (ADR 0002).
 * Declare columns + rows; this owns the breakpoint flip: a full table at `md+`,
 * a stacked card list below `md`. Building factor: title in bold; the rest of
 * the fields render as label/value rows.
 */
export interface Column<Row> {
  key: string;
  header: React.ReactNode;
  render: (row: Row) => React.ReactNode;
  align?: 'left' | 'right';
  cardLabel?: string;     // field label shown in card mode (falls back to `key`)
  hideOnMobile?: boolean; // drop this column in card mode
  emphasis?: boolean;     // bubble this value into the card title line
}

interface ResponsiveTableProps<Row> {
  rows: Row[];
  rowKey: (row: Row) => string;
  columns: Column<Row>[];
  onRowClick?: (row: Row) => void;
}

const alignCls = (a?: 'left' | 'right') => (a === 'right' ? 'text-right' : 'text-left');

export const ResponsiveTable = <Row,>({
  rows, rowKey, columns, onRowClick,
}: ResponsiveTableProps<Row>): React.ReactElement => {
  const handleTap = (row: Row) => () => onRowClick && onRowClick(row);

  const Table = (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {columns.map((c) => (
              <th key={c.key} className={`py-3 px-4 ${alignCls(c.align)}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-sm">
          {rows.map((row) => (
            <tr key={rowKey(row)} onClick={onRowClick ? handleTap(row) : undefined}
              className={`transition ${onRowClick ? 'hover:bg-slate-800/40 cursor-pointer group' : ''}`}>
              {columns.map((c) => (
                <td key={c.key} className={`py-3.5 px-4 ${alignCls(c.align)}`}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const emphasisCols = columns.filter((c) => c.emphasis);
  const otherCols = columns.filter((c) => !c.hideOnMobile && !c.emphasis);
  const rowCls = `glass-card p-4 rounded-2xl border border-slate-800 mb-3 ${onRowClick ? 'cursor-pointer hover:border-slate-700' : ''}`;

  const Cards = (
    <div className="md:hidden mt-2">
      {rows.map((row) => (
        <div key={rowKey(row)} onClick={onRowClick ? handleTap(row) : undefined} className={rowCls}>
          {emphasisCols.length > 0 && (
            <div className="text-base font-bold">{emphasisCols[0].render(row)}</div>
          )}
          <div className="divide-y divide-slate-800/60 mt-2">
            {otherCols.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-2 py-1 text-sm">
                <span className="text-[11px] text-slate-400 font-medium">{c.cardLabel ?? c.key}</span>
                <span className={`text-slate-200 ${c.align === 'right' ? 'font-mono' : ''}`}>{c.render(row)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {Table}
      {Cards}
    </>
  );
};