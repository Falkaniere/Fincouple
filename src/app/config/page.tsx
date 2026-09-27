import { isSupabaseConfigured } from '@/lib/supabase/env';
import { redirect } from 'next/navigation';

/**
 * Tela mostrada quando o app foi publicado sem as variáveis do Supabase.
 * Evita a tela branca com erro de build e diz exatamente o que fazer.
 */
export default function ConfigPage() {
  if (isSupabaseConfigured) redirect('/');

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <h1 className="text-2xl font-bold">Falta conectar o banco de dados</h1>
      <p className="mt-2 text-muted">
        O Fincouple guarda os dados do casal no Supabase. Configure estas duas variáveis de
        ambiente e recarregue:
      </p>

      <ul className="mt-5 space-y-2 text-sm">
        <li className="card px-4 py-3 font-mono">NEXT_PUBLIC_SUPABASE_URL</li>
        <li className="card px-4 py-3 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
      </ul>

      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>
          Crie um projeto gratuito em{' '}
          <a className="text-brand underline" href="https://supabase.com" target="_blank" rel="noreferrer">
            supabase.com
          </a>
          .
        </li>
        <li>
          No painel do projeto, abra <strong>SQL Editor</strong> e rode o arquivo{' '}
          <code className="font-mono">supabase/migrations/0001_init.sql</code> do repositório.
        </li>
        <li>
          Em <strong>Project Settings → API</strong>, copie a <em>Project URL</em> e a chave{' '}
          <em>anon public</em>.
        </li>
        <li>
          Cole as duas na Vercel, em <strong>Settings → Environment Variables</strong>, e faça um
          novo deploy.
        </li>
      </ol>

      <p className="mt-6 text-sm text-muted">
        O passo a passo completo está no <code className="font-mono">README.md</code>.
      </p>
    </main>
  );
}
