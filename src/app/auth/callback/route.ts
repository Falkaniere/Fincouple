import { NextResponse, type NextRequest } from 'next/server';

import { publicOrigin } from '@/lib/origin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Destino do link mágico. Troca o código de uso único por uma sessão em cookie
 * e devolve a pessoa para a tela que ela queria.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = publicOrigin(request);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';

  // Só aceitamos caminho interno: um `next` absoluto viraria redirecionamento
  // aberto para fora do app.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (!code) {
    return NextResponse.redirect(new URL('/login?erro=link-invalido', origin));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Link já usado ou expirado: pedir outro é o caminho.
    return NextResponse.redirect(new URL('/login?erro=link-expirado', origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
