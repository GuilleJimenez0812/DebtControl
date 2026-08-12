import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../i18n/translations';
import type { Language } from '../i18n/translations';
import { Search, Loader2, Truck, User } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

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

const money = (n: number) => `$${n.toFixed(2)}`;

export const SearchBar: React.FC<SearchBarProps> = ({ language, onSelectResult }) => {
  const t = translations[language];
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="relative mx-auto my-6 w-full max-w-3xl" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-ink-muted-dark" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-[10px] border border-line bg-panel py-3 pl-10 pr-12 text-base text-ink shadow-apple outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/30 placeholder:text-ink-muted dark:border-line-dark dark:bg-panel dark:text-ink-dark dark:placeholder:text-ink-muted-dark dark:shadow-apple-dark"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-[10px] border border-line bg-panel shadow-apple dark:border-line-dark dark:bg-panel dark:shadow-apple-dark"
          >
            {results.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-muted dark:text-ink-muted-dark">{t.noResultsFound}</div>
            ) : (
              <ul className="m-0 list-none p-0">
                {results.map((result) => (
                  <li
                    key={result.purchase_id}
                    onClick={() => handleSelect(result.purchase_id)}
                    className="cursor-pointer border-b border-line p-3 px-4 transition-colors last:border-0 hover:bg-black/[0.03] dark:border-line-dark dark:hover:bg-white/[0.04]"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <strong className="font-mono text-sm font-bold text-ink dark:text-ink-dark">{result.order_number}</strong>
                      <span className="font-mono tabular-nums text-sm font-semibold text-success">{money(result.total_cost)}</span>
                    </div>

                    {result.tracking_number && (
                      <div className="mb-1 flex items-center gap-1 text-xs text-accent">
                        <Truck className="h-3 w-3" />
                        <span>{t.matchedTracking}</span>
                        <span className="font-mono">{result.tracking_number}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-ink-tertiary dark:text-ink-tertiary-dark">
                      <span className="flex items-center gap-1 rounded-[6px] bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-secondary dark:bg-white/[0.06] dark:text-ink-secondary-dark">
                        <User className="h-3 w-3" />
                        {result.person_name}
                      </span>
                      <span className="opacity-80">{result.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};