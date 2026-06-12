'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { PermissionProvider } from '@/context/PermissionContext';

export function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PermissionProvider>{children}</PermissionProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#112240',
            color: '#F8FAFC',
            border: '0.5px solid #1E3A5F',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#112240' },
          },
          error: {
            iconTheme: { primary: '#C41E3A', secondary: '#112240' },
          },
        }}
      />
    </QueryClientProvider>
  );
}
