'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface RetainerSearchResult {
  id: string;
  serviceName: string;
  amount: number;
  currency: string;
  status: string;
  clientId: string;
  clientName: string | null;
}

interface Props {
  value: RetainerSearchResult | null;
  onChange: (retainer: RetainerSearchResult | null) => void;
  placeholder?: string;
}

export function RetainerSearch({ value, onChange, placeholder = 'Search active retainers…' }: Props): JSX.Element {
  const [query, setQuery] = useState(value ? `${value.serviceName} — ${value.clientName ?? ''}` : '');
  const [results, setResults] = useState<RetainerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((term: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (term.length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/proxy/retainers?search=${encodeURIComponent(term)}&status=ACTIVE`,
          { credentials: 'include' },
        );
        const json = await res.json() as { data?: RetainerSearchResult[] };
        setResults(json.data ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function pick(r: RetainerSearchResult) {
    onChange(r);
    setQuery(`${r.serviceName} — ${r.clientName ?? r.clientId}`);
    setResults([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className="w-full rounded-md border border-cdy-navy-border bg-cdy-navy px-3 py-2 text-sm text-cdy-white placeholder:text-cdy-muted focus:outline-none focus:ring-1 focus:ring-cdy-red"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-cdy-muted hover:text-cdy-white"
        >
          ✕
        </button>
      )}
      {loading && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-cdy-muted">…</div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light shadow-lg">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pick(r)}
              className="block w-full px-3 py-2.5 text-left hover:bg-cdy-navy"
            >
              <div className="text-sm font-medium text-cdy-white">{r.serviceName}</div>
              <div className="text-xs text-cdy-muted">
                {r.clientName ?? r.clientId} · {r.currency} {r.amount.toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-cdy-navy-border bg-cdy-navy-light px-3 py-2 text-sm text-cdy-muted shadow-lg">
          No active retainers found
        </div>
      )}
    </div>
  );
}
