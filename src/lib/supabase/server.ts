import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Cliente para Server Components e Route Handlers. No Next 16 `cookies()` é
 * assíncrono, daí o await.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem escrever cookies. O refresh do token
          // acontece no proxy.ts, que sim consegue — então ignorar aqui é
          // seguro e é o padrão recomendado pelo Supabase.
        }
      },
    },
  });
}
