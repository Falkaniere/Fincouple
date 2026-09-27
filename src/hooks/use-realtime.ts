'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Assina as mudanças do casal no Postgres e invalida o cache local.
 * É o que faz um lançamento feito num celular aparecer no outro sem recarregar.
 */
export function useRealtime(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coupleId) return;

    const supabase = getSupabaseBrowserClient();
    // Um canal por casal: o nome precisa ser estável entre os dois aparelhos.
    const channel = supabase.channel(`couple:${coupleId}`);

    const watch = (table: string, keys: string[]) => {
      channel.on(
        'postgres_changes',
        // O filtro roda no servidor, então nada de outro casal chega aqui
        // (a RLS também barra, isto é só para não gastar rede).
        { event: '*', schema: 'public', table, filter: `couple_id=eq.${coupleId}` },
        () => {
          for (const key of keys) {
            void queryClient.invalidateQueries({ queryKey: [key] });
          }
        },
      );
    };

    watch('transactions', ['transactions']);
    watch('bills', ['bills']);
    // Uma categoria nova tem que aparecer na folha de lançamento do outro,
    // e o nome dela é usado no ranking.
    watch('categories', ['categories', 'transactions']);

    // `couples` filtra por id, não por couple_id (é a própria linha do casal).
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
      () => {
        void queryClient.invalidateQueries({ queryKey: ['couple'] });
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coupleId, queryClient]);
}
