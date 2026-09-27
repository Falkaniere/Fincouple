'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { monthStart, shiftMonth, type MonthKey } from '@/lib/month';
import { buildInstallments } from '@/lib/installments';
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
        // `effective_month` já resolve o mês certo sozinho: cai no
        // billing_month quando existe (compra de cartão contada em outro
        // mês por causa da fatura), senão no mês da própria data.
        .eq('effective_month', monthStart(month))
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
  /** Mês em que o lançamento deve contar, se diferente do mês da data. */
  billingMonth: MonthKey | null;
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
        billing_month: input.billingMonth ? monthStart(input.billingMonth) : null,
      });

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export interface InstallmentPurchaseInput {
  /** Valor de CADA parcela -- não é dividido, todas saem com este valor. */
  amountCentsPerInstallment: number;
  installmentCount: number;
  firstOccurredOn: string;
  categoryId: string | null;
  description: string | null;
  /**
   * Mês da fatura da primeira parcela, se diferente do mês da data. As
   * parcelas seguintes andam a partir daí, um mês de cada vez -- do mesmo
   * jeito que a data de cada parcela já anda.
   */
  firstBillingMonth: MonthKey | null;
}

/**
 * Cria uma despesa parcelada: N lançamentos, um por mês, ligados pelo mesmo
 * `installment_group`. Um insert só, para as parcelas aparecerem juntas no
 * outro celular (o realtime dispara uma vez por linha, mas todas chegam
 * praticamente ao mesmo tempo).
 */
export function useCreateInstallmentPurchase(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InstallmentPurchaseInput) => {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();

      const group = crypto.randomUUID();
      const parts = buildInstallments(
        input.amountCentsPerInstallment,
        input.installmentCount,
        input.firstOccurredOn,
      );

      const { error } = await supabase.from('transactions').insert(
        parts.map((part, index) => ({
          couple_id: coupleId!,
          kind: 'expense' as const,
          amount_cents: part.amountCents,
          occurred_on: part.occurredOn,
          category_id: input.categoryId,
          description: input.description,
          created_by: auth.user?.id ?? null,
          installment_group: group,
          installment_no: part.installmentNo,
          installment_total: part.installmentTotal,
          billing_month: input.firstBillingMonth
            ? monthStart(shiftMonth(input.firstBillingMonth, index))
            : null,
        })),
      );

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

/**
 * Apaga esta parcela e as seguintes do mesmo grupo (mantém as anteriores,
 * que já aconteceram). É a opção ao lado de "apagar só este lançamento".
 */
export function useDeleteInstallmentsFrom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!transaction.installment_group || transaction.installment_no === null) {
        throw new Error('Este lançamento não faz parte de um parcelamento.');
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('installment_group', transaction.installment_group)
        .gte('installment_no', transaction.installment_no);

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
          billing_month: input.billingMonth ? monthStart(input.billingMonth) : null,
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
