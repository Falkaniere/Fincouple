'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Couple, CoupleMember } from '@/lib/types';

export const coupleKeys = {
  session: ['session'] as const,
  couple: ['couple'] as const,
  members: (coupleId: string) => ['members', coupleId] as const,
};

/** Usuário logado, ou null. */
export function useSession() {
  return useQuery<User | null>({
    queryKey: coupleKeys.session,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * O casal da pessoa logada. `null` significa "logado mas ainda sem casal",
 * que é o caso que manda para o onboarding.
 */
export function useCouple() {
  return useQuery<Couple | null>({
    queryKey: coupleKeys.couple,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      // A RLS já limita a consulta ao casal de quem está logado.
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as Couple | null) ?? null;
    },
  });
}

export function useCoupleMembers(coupleId: string | undefined) {
  return useQuery<CoupleMember[]>({
    queryKey: coupleKeys.members(coupleId ?? 'none'),
    enabled: Boolean(coupleId),
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('couple_members')
        .select('*')
        .eq('couple_id', coupleId!)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as CoupleMember[];
    },
  });
}

/** Cria o casal via RPC (que também semeia categorias e vira membro). */
export function useCreateCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      monthlyLimitCents: number;
      displayName?: string;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('create_couple', {
        couple_name: input.name,
        monthly_limit_cents: input.monthlyLimitCents,
        display_name: input.displayName ?? null,
      });

      if (error) throw error;
      return data as Couple;
    },
    onSuccess: (couple) => {
      queryClient.setQueryData(coupleKeys.couple, couple);
      void queryClient.invalidateQueries();
    },
  });
}

/** Entra num casal existente pelo código do convite. */
export function useJoinCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('join_couple', {
        code: code.trim().toUpperCase(),
      });

      if (error) throw error;
      return data as Couple;
    },
    onSuccess: (couple) => {
      queryClient.setQueryData(coupleKeys.couple, couple);
      void queryClient.invalidateQueries();
    },
  });
}

export function useUpdateMonthlyLimit(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (monthlyLimitCents: number) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from('couples')
        .update({ monthly_limit_cents: monthlyLimitCents })
        .eq('id', coupleId!);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coupleKeys.couple }),
  });
}

export function useLeaveCouple() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (coupleId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.rpc('leave_couple', { target_couple: coupleId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.clear(),
  });
}
