import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../i18n/translations';
import type { Language } from '../i18n/translations';

interface SearchResult {
  purchase_id: string;
  person_name: string;
  order_number: string;
  description: string;
  tracking_number?: string;
  total_cost: number;
}

interface SearchBarProps {
  language: Language;
  onSelectResult: (purchaseId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ language, onSelectResult }) => {
  const t = translations[language];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/v1/debts/search?q=${encodeURIComponent(query)}&limit=10`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('debtcontrol_token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (purchaseId: string) => {
    setIsOpen(false);
    setQuery('');
    onSelectResult(purchaseId);
  };

  return (
    <div className="search-bar-container relative w-full max-w-3xl mx-auto my-6" ref={dropdownRef}>
      <div className="search-input-wrapper relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={t.searchPlaceholder || 'Buscar por orden o tracking...'}
          className="w-full py-3 pl-10 pr-12 text-base rounded-xl border border-slate-700 bg-slate-900/60 text-slate-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 backdrop-blur-sm"
        />
        {/* Search Icon SVG */}
        <svg 
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400">
             <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
             </svg>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="search-dropdown absolute top-full left-0 right-0 mt-2 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 z-50 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              {t.noResultsFound || 'No results found'}
            </div>
          ) : (
            <ul className="list-none p-0 m-0">
              {results.map((result) => (
                <li 
                  key={result.purchase_id}
                  onClick={() => handleSelect(result.purchase_id)}
                  className="p-3 px-4 border-b border-slate-800/80 cursor-pointer transition-colors hover:bg-slate-800/60 last:border-0"
                >
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-slate-200 text-sm">{result.order_number}</strong>
                    <span className="font-semibold text-emerald-400 text-sm">${result.total_cost.toFixed(2)}</span>
                  </div>
                  
                  {result.tracking_number && (
                    <div className="text-xs text-indigo-300 mb-1 flex items-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 opacity-80">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                      {t.matchedTracking || 'Tracking:'} <span className="font-mono ml-1">{result.tracking_number}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2">
                    <span className="font-semibold text-slate-300 border border-slate-700 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] uppercase">
                      {result.person_name}
                    </span>
                    <span className="opacity-80">{result.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
