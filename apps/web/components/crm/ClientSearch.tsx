'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useClientSearch } from '@/hooks/useCrm';
import type { ClientSearchResult } from '@cdy/shared';
import { cn } from '@/lib/utils';

interface ClientSearchProps {
  value: ClientSearchResult | null;
  onChange: (client: ClientSearchResult | null) => void;
  placeholder?: string;
  allowManualId?: boolean;
  onCreateClient?: (initialName: string) => void;
}

export function ClientSearch({
  value,
  onChange,
  placeholder = 'Search by company name, contact, or email...',
  allowManualId = true,
  onCreateClient,
}: ClientSearchProps): JSX.Element {
  const [query, setQuery] = useState(value?.companyName ?? '');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [] } = useClientSearch(debounced);

  function selectClient(client: ClientSearchResult): void {
    onChange(client);
    setQuery(client.companyName);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {value && (
        <p className="mt-1 text-xs text-cdy-muted">
          {value.contactName} · {value.email}
        </p>
      )}
      {!value && query && results.length === 0 && debounced.length >= 2 && (
        <div className="mt-1 flex flex-col gap-1">
          {onCreateClient && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-cdy-red hover:underline"
              onClick={() => onCreateClient(query)}
            >
              <Plus className="h-3 w-3" />
              Create new client &quot;{query}&quot;
            </button>
          )}
          {allowManualId && !onCreateClient && (
            <button
              type="button"
              className="text-xs text-cdy-red hover:underline"
              onClick={() =>
                onChange({
                  id: query,
                  companyName: query,
                  contactName: query,
                  email: `${query}@manual.local`,
                  country: 'RW',
                })
              }
            >
              Use &quot;{query}&quot; as client ID
            </button>
          )}
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-cdy-navy-border bg-cdy-navy-light shadow-lg">
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-cdy-navy',
                  value?.id === client.id && 'bg-cdy-navy',
                )}
                onMouseDown={() => selectClient(client)}
              >
                <span className="font-medium text-cdy-white">{client.companyName}</span>
                <span className="block text-xs text-cdy-muted">
                  {client.contactName} · {client.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
