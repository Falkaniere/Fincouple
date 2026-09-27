'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCouple, useCreateCouple, useJoinCouple } from '@/hooks/use-couple';
import { maskAmountInput, parseAmountToCents } from '@/lib/money';
import { Button, Field, Input, Notice, Spinner } from './ui';
import { InviteCodeCard } from './invite-code-card';
import { HeartIcon } from './icons';

type Step = 'choose' | 'create' | 'join' | 'created';

export function OnboardingFlow() {
  const router = useRouter();
  const { data: couple, isLoading } = useCouple();
  const [step, setStep] = useState<Step>('choose');

  const createCouple = useCreateCouple();
  const joinCouple = useJoinCouple();

  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [code, setCode] = useState('');

  // Já tem casal e não acabou de criar: não há o que fazer aqui.
  if (isLoading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (couple && step !== 'created') {
    router.replace('/');
    return null;
  }

  if (step === 'created' && couple) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Prontinho! 🎉</h1>
        <p className="mt-2 text-muted">
          O controle <strong className="text-text">{couple.name}</strong> foi criado. Agora mande
          este código para quem vai usar com você.
        </p>

        <div className="mt-6">
          <InviteCodeCard couple={couple} />
        </div>

        <Button size="lg" className="mt-6 w-full" onClick={() => router.replace('/')}>
          Ir para o controle
        </Button>
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="flex min-h-[80dvh] flex-col justify-center">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand text-white">
            <HeartIcon className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Vamos começar</h1>
          <p className="mt-2 text-muted">
            Um de vocês cria o controle. O outro entra com o código.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Button size="lg" className="w-full" onClick={() => setStep('create')}>
            Criar nosso controle
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => setStep('join')}
          >
            Já tenho um código
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div>
        <Button variant="ghost" className="-ml-4 mb-2" onClick={() => setStep('choose')}>
          ← Voltar
        </Button>
        <h1 className="text-2xl font-bold">Criar o controle</h1>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            createCouple.mutate(
              { name: name.trim(), monthlyLimitCents: parseAmountToCents(limit) },
              { onSuccess: () => setStep('created') },
            );
          }}
        >
          <Field label="Nome do controle" hint="Só para vocês se reconhecerem.">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nossa casa"
              maxLength={80}
              autoFocus
              required
            />
          </Field>

          <Field
            label="Limite de gastos por mês"
            hint="É a meta da barra de progresso. Pode mudar depois em Ajustes."
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                R$
              </span>
              <Input
                value={limit}
                onChange={(e) => setLimit(maskAmountInput(e.target.value))}
                placeholder="0,00"
                inputMode="numeric"
                className="pl-11"
              />
            </div>
          </Field>

          {createCouple.isError && (
            <Notice>Não deu para criar agora. Confira a conexão e tente de novo.</Notice>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={createCouple.isPending}
            disabled={!name.trim()}
          >
            Criar
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" className="-ml-4 mb-2" onClick={() => setStep('choose')}>
        ← Voltar
      </Button>
      <h1 className="text-2xl font-bold">Entrar com o código</h1>
      <p className="mt-2 text-muted">
        Peça o código de 6 letras para quem criou o controle.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          joinCouple.mutate(code, { onSuccess: () => router.replace('/') });
        }}
      >
        <Field label="Código do casal">
          <Input
            value={code}
            // Sempre em maiúsculas: o código é armazenado assim.
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABC234"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="text-center font-mono text-2xl tracking-[0.3em]"
            autoFocus
            required
          />
        </Field>

        {joinCouple.isError && (
          <Notice>
            Código não encontrado. Confira as 6 letras — ele não diferencia maiúsculas.
          </Notice>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={joinCouple.isPending}
          disabled={code.length < 6}
        >
          Entrar no controle
        </Button>
      </form>
    </div>
  );
}
