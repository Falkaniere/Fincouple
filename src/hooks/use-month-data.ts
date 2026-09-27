'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { monthStart, nextMonthStart, type MonthKey } from '@/lib/month';
import { summarizeMonth, type MonthSummary } from '@/lib/summary';
import type { Category, Kind, Transaction } from '@/lib/types';

export const dataKeys = {
  categories: (coupleId: string) => ['categories', coupleId] as const,
  transactions: (coupleId: string, month: MonthKey) =>
    ['transactions', coupleId, month] as const,
  bills: (coupleId: string) => ['bills', coupleId] as const,
};

export function useCategories(coupleId: string | undefined) {
  return useQuery<Category[]>({
    queryKey: dataKeys.categories(coupleId ?? 'none'),
    enabled: Boolean(coupleId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('couple_id', coupleId!)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

/** Lançamentos do mês selecionado, do mais recente para o mais antigo. */
export function useTransactions(coupleId: string | undefined, month: MonthKey) {
  return useQuery<Transaction[]>({
    queryKey: dataKeys.transactions(coupleId ?? 'none', month),
    enabled: Boolean(coupleId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('couple_id', coupleId!)
        // Intervalo meio aberto: pega o mês inteiro sem errar fevereiro.
        .gte('occurred_on', monthStart(month))
        .lt('occurred_on', nextMonthStart(month))
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}

/** Agrega os lançamentos do mês para a tela inicial. */
export function useMonthSummary(
  transactions: Transaction[] | undefined,
  categories: Category[] | undefined,
): MonthSummary {
  return useMemo(
    () => summarizeMonth(transactions ?? [], categories ?? []),
    [transactions, categories],
  );
}

// ------------------------------------------------------------- mutações

export interface TransactionInput {
  kind: Kind;
  amountCents: number;
  occurredOn: string;
  categoryId: string | null;
  description: string | null;
}

export function useCreateTransaction(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();

      const { error } = await supabase.from('transactions').insert({
        couple_id: coupleId!,
        kind: input.kind,
        amount_cents: input.amountCents,
        occurred_on: input.occurredOn,
        category_id: input.categoryId,
        description: input.description,
        created_by: auth.user?.id ?? null,
      });

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TransactionInput }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('transactions')
        .update({
          kind: input.kind,
          amount_cents: input.amountCents,
          occurred_on: input.occurredOn,
          category_id: input.categoryId,
          description: input.description,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

/**
 * Cria uma categoria no meio do lançamento. Devolve a categoria para a folha
 * já deixá-la selecionada, e ela passa a aparecer nos próximos lançamentos.
 */
export function useCreateCategory(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; kind: Kind; color?: string }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('categories')
        .insert({
          couple_id: coupleId!,
          name: input.name.trim(),
          kind: input.kind,
          ...(input.color ? { color: input.color } : {}),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Lançamentos daquela categoria ficam "Sem categoria": recarregar.
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
