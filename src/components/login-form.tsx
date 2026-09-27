'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button, Field, Input, Notice } from './ui';
import { HeartIcon, MailIcon } from './icons';

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  // O callback devolve ?erro= quando o link já foi usado ou venceu.
  const linkError = searchParams.get('erro');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus('sending');

    // Depois de clicar no link do email, o Supabase manda a pessoa para o
    // callback, que troca o código por sessão e segue para onde ela queria ir.
    const next = searchParams.get('next') ?? '/';
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (signInError) {
      setStatus('idle');
      setError(
        signInError.message.toLowerCase().includes('rate')
          ? 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
          : 'Não conseguimos enviar o link. Confira o email e tente de novo.',
      );
      return;
    }

    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <MailIcon className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Olhe seu email</h1>
        <p className="mt-2 text-muted">
          Mandamos um link de acesso para <strong className="text-text">{email}</strong>. Abra o
          email neste mesmo celular e toque no link.
        </p>
        <p className="mt-4 text-sm text-muted">
          Não chegou em um minuto? Dê uma olhada no spam.
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => {
            setStatus('idle');
            setError(null);
          }}
        >
          Usar outro email
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand text-white">
          <HeartIcon className="size-7" />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Fincouple</h1>
        <p className="mt-2 text-muted">O controle de gastos de vocês dois, no mesmo lugar.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Seu email" hint="Sem senha: mandamos um link de acesso.">
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            autoComplete="email"
            inputMode="email"
            autoFocus
            required
          />
        </Field>

        {error && <Notice>{error}</Notice>}
        {!error && linkError && (
          <Notice>
            {linkError === 'link-expirado'
              ? 'Esse link já foi usado ou venceu. Peça um novo abaixo.'
              : 'O link não funcionou. Peça um novo abaixo.'}
          </Notice>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={status === 'sending'}
          disabled={!email.includes('@')}
        >
          Receber link de acesso
        </Button>
      </form>
    </>
  );
}
