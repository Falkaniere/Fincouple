'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { dataKeys } from './use-month-data';
import type { Bill } from '@/lib/types';

/** Todas as contas do casal, das mais próximas de vencer para as mais longes. */
export function useBills(coupleId: string | undefined) {
  return useQuery<Bill[]>({
    queryKey: dataKeys.bills(coupleId ?? 'none'),
    enabled: Boolean(coupleId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('couple_id', coupleId!)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Bill[];
    },
  });
}

export interface BillInput {
  title: string;
  amountCents: number;
  dueDate: string;
  categoryId: string | null;
}

export function useCreateBill(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BillInput) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('bills').insert({
        couple_id: coupleId!,
        title: input.title.trim(),
        amount_cents: input.amountCents,
        due_date: input.dueDate,
        category_id: input.categoryId,
      });

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: BillInput }) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('bills')
        .update({
          title: input.title.trim(),
          amount_cents: input.amountCents,
          due_date: input.dueDate,
          category_id: input.categoryId,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });
}

/**
 * Marca ou desmarca a conta como paga: é o botão que fica verde com o check.
 * Atualiza a lista na hora (otimista) e desfaz se o servidor recusar, porque
 * esperar a ida e volta faz o toque parecer travado.
 */
export function useToggleBillPaid(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  const key = dataKeys.bills(coupleId ?? 'none');

  return useMutation({
    mutationFn: async ({ bill }: { bill: Bill }) => {
      const supabase = getSupabaseBrowserClient();
      const paying = bill.paid_at === null;

      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('bills')
        .update({
          paid_at: paying ? new Date().toISOString() : null,
          paid_by: paying ? (auth.user?.id ?? null) : null,
        })
        .eq('id', bill.id);

      if (error) throw error;
    },
    onMutate: async ({ bill }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Bill[]>(key);

      queryClient.setQueryData<Bill[]>(key, (bills) =>
        (bills ?? []).map((b) =>
          b.id === bill.id
            ? { ...b, paid_at: b.paid_at === null ? new Date().toISOString() : null }
            : b,
        ),
      );

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills'] }),
  });
}
