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
  /** Total de parcelas da compra (não só as que vão ser criadas agora). */
  installmentCount: number;
  /**
   * Número da primeira parcela a criar. Maior que 1 quando a compra já vinha
   * sendo paga antes de entrar no app -- só cria as parcelas que faltam, já
   * com a numeração certa (ex.: começar na 8ª de 12 cria 8, 9, 10, 11 e 12).
   */
  startInstallmentNo: number;
  firstOccurredOn: string;
  categoryId: string | null;
  description: string | null;
  /**
   * Mês da fatura da primeira parcela criada, se diferente do mês da data.
   * As parcelas seguintes andam a partir daí, um mês de cada vez -- do mesmo
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
        input.startInstallmentNo,
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

/**
 * Corrige a numeração de uma compra parcelada inteira -- as parcelas que já
 * passaram e as que ainda vêm, todas de uma vez. Serve para os dois casos
 * mais comuns de numeração errada: uma compra lançada com o total errado, ou
 * uma compra que já vinha sendo paga antes de entrar no app e ficou marcada
 * como "1 de N" em vez do número real.
 *
 * Desloca `installment_no` de cada parcela do grupo pela mesma diferença
 * entre o número antigo e o novo da parcela editada, e atualiza
 * `installment_total` para todas. Cada linha valida sozinha (o banco exige
 * `installment_no` entre 1 e o total), então nenhuma parcela pode ficar fora
 * do intervalo depois da correção.
 */
export function useRenumberInstallments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      group,
      oldNo,
      newNo,
      newTotal,
    }: {
      group: string;
      oldNo: number;
      newNo: number;
      newTotal: number;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const delta = newNo - oldNo;

      const { data: siblings, error: fetchError } = await supabase
        .from('transactions')
        .select('id, installment_no')
        .eq('installment_group', group);
      if (fetchError) throw fetchError;

      const updates = (siblings ?? []).map((row) => ({
        id: row.id as string,
        installment_no: (row.installment_no as number) + delta,
      }));

      if (updates.some((u) => u.installment_no < 1 || u.installment_no > newTotal)) {
        throw new Error(
          'Essa numeração deixaria alguma parcela fora do intervalo. Ajuste o total ou o número.',
        );
      }

      const results = await Promise.all(
        updates.map((u) =>
          supabase
            .from('transactions')
            .update({ installment_no: u.installment_no, installment_total: newTotal })
            .eq('id', u.id),
        ),
      );

      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    // Mesmo numa falha parcial, atualiza a tela com o que já foi salvo --
    // dá para ver o que faltou e tentar de novo.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
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

export interface ImportRowInput {
  occurredOn: string;
  description: string | null;
  amountCents: number;
  categoryId: string | null;
}

/**
 * Importa vários gastos de uma vez (extrato de fatura em .csv/.xlsx/.pdf).
 * Um insert só, como no parcelamento, para todos chegarem juntos no outro
 * celular. `billingMonth` é opcional e vale para o lote inteiro -- útil
 * quando a fatura já fechou e as compras do mês precisam contar no mês
 * seguinte.
 */
export function useImportTransactions(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rows,
      billingMonth,
    }: {
      rows: ImportRowInput[];
      billingMonth: MonthKey | null;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getUser();

      const { error } = await supabase.from('transactions').insert(
        rows.map((row) => ({
          couple_id: coupleId!,
          kind: 'expense' as const,
          amount_cents: row.amountCents,
          occurred_on: row.occurredOn,
          category_id: row.categoryId,
          description: row.description,
          created_by: auth.user?.id ?? null,
          billing_month: billingMonth ? monthStart(billingMonth) : null,
        })),
      );

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
