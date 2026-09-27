import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { publicOrigin } from '@/lib/origin';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/env';

/** Rotas que podem ser abertas sem sessão. */
const PUBLIC_PATHS = ['/login', '/auth', '/config'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Renova o token de acesso a cada navegação e barra quem não está logado.
 * No Next 16 isso se chama `proxy` (antes era `middleware`).
 */
export async function proxy(request: NextRequest) {
  // Sem Supabase configurado o app inteiro vira a tela de instruções.
  if (!isSupabaseConfigured) {
    if (request.nextUrl.pathname === '/config') return NextResponse.next();
    return NextResponse.redirect(new URL('/config', publicOrigin(request)));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Uma resposta que grava cookie de sessão nunca pode ser cacheada por
        // CDN, senão a sessão de um vaza para o outro.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // getUser() (e não getSession()) porque ele valida o token no servidor.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const loginUrl = new URL('/login', publicOrigin(request));
    // Volta para onde a pessoa queria ir depois de entrar.
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', publicOrigin(request)));
  }

  return response;
}

export const config = {
  // Deixa passar direto os arquivos estáticos, o service worker e o manifest.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
};
