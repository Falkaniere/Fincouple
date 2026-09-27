'use client';

import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCouple } from '@/hooks/use-couple';
import { useRealtime } from '@/hooks/use-realtime';
import { currentMonthKey, type MonthKey } from '@/lib/month';
import type { Couple } from '@/lib/types';
import { BottomNav } from './bottom-nav';
import { InstallPrompt } from './install-prompt';
import { Spinner } from './ui';

interface AppContextValue {
  couple: Couple;
  month: MonthKey;
  setMonth: (month: MonthKey) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Casal e mês selecionado, compartilhados pelas três abas. */
export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp precisa estar dentro de <AppShell>.');
  return value;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: couple, isLoading, isError } = useCouple();
  const [month, setMonth] = useState<MonthKey>(() => currentMonthKey());

  // Liga o realtime o mais alto possível, para valer nas três abas.
  useRealtime(couple?.id);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-semibold">Não foi possível carregar o controle.</p>
        <p className="text-sm text-muted">Confira sua conexão e recarregue a página.</p>
      </div>
    );
  }

  // Logado, mas ainda sem casal: escolher entre criar e entrar com o código.
  if (!couple) {
    router.replace('/onboarding');
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ couple, month, setMonth }}>
      {/* pb-24 reserva a altura da navegação inferior fixa. */}
      <div className="mx-auto max-w-lg pb-24">{children}</div>
      <BottomNav />
      <InstallPrompt />
    </AppContext.Provider>
  );
}
