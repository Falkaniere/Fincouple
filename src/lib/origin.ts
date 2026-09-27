import type { NextRequest } from 'next/server';

/**
 * A origem pública do app, como o navegador a vê.
 *
 * Não dá para confiar em `request.nextUrl.origin` nem em `request.url`: atrás
 * de um proxy (a Vercel, e também `next start`) o host interno pode ser outro,
 * e redirecionar para um host diferente descarta o cookie de sessão — a pessoa
 * clica no link do email e volta para a tela de login.
 */
export function publicOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return request.nextUrl.origin;

  const proto =
    request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '');

  return `${proto}://${host}`;
}
