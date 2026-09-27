'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  // useState garante um QueryClient por montagem do app, não um global que
  // vazaria cache entre requisições no servidor.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // O Realtime é quem avisa das mudanças, então não precisamos
            // refazer a busca a cada foco de janela.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
