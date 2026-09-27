'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useApp } from './app-shell';
import {
  useCoupleMembers,
  useLeaveCouple,
  useSession,
  useUpdateMonthlyLimit,
} from '@/hooks/use-couple';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatCents, maskAmountInput, parseAmountToCents } from '@/lib/money';
import { ExportButtons } from './export-buttons';
import { InviteCodeCard } from './invite-code-card';
import { Button, Input, Notice } from './ui';
import { LogoutIcon } from './icons';

export function SettingsScreen() {
  const { couple } = useApp();
  const router = useRouter();
  const { data: user } = useSession();
  const { data: members } = useCoupleMembers(couple.id);
  const leaveCouple = useLeaveCouple();

  const [confirmingLeave, setConfirmingLeave] = useState(false);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <>
      <header className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="mt-1 text-sm text-muted">{couple.name}</p>
      </header>

      <div className="space-y-3 px-4 py-4">
        <MonthlyLimitCard />

        <InviteCodeCard couple={couple} />

        <section className="card p-5">
          <h2 className="font-semibold">Quem usa este controle</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(members ?? []).map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {member.display_name?.trim() ||
                    (member.user_id === user?.id ? (user?.email ?? 'Você') : 'Parceiro(a)')}
                </span>
                {member.user_id === user?.id && (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong">
                    você
                  </span>
                )}
              </li>
            ))}
          </ul>

          {(members?.length ?? 0) < 2 && (
            <p className="mt-3 text-sm text-muted">
              Mande o código acima para a outra pessoa entrar.
            </p>
          )}
        </section>

        <ExportButtons />

        <section className="card p-5">
          <h2 className="font-semibold">Conta</h2>
          <p className="mt-1 text-sm text-muted">{user?.email}</p>

          <Button variant="secondary" className="mt-4 w-full" onClick={() => void signOut()}>
            <LogoutIcon className="size-4" />
            Sair deste aparelho
          </Button>
          <p className="mt-2 text-xs text-muted">
            Seus dados continuam salvos. Para voltar, basta pedir um novo link de acesso.
          </p>

          <div className="mt-5 border-t border-border pt-4">
            {confirmingLeave ? (
              <div className="space-y-2">
                <Notice tone="error">
                  Sair do controle tira o seu acesso aos lançamentos deste casal. Os dados
                  continuam com a outra pessoa.
                </Notice>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirmingLeave(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    loading={leaveCouple.isPending}
                    onClick={() =>
                      leaveCouple.mutate(couple.id, {
                        onSuccess: () => router.replace('/onboarding'),
                      })
                    }
                  >
                    Sair do controle
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingLeave(true)}
                className="text-sm font-medium text-negative underline"
              >
                Sair deste controle
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function MonthlyLimitCard() {
  const { couple } = useApp();
  const updateLimit = useUpdateMonthlyLimit(couple.id);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() =>
    couple.monthly_limit_cents > 0 ? maskAmountInput(String(couple.monthly_limit_cents)) : '',
  );

  if (!editing) {
    return (
      <section className="card p-5">
        <h2 className="font-semibold">Limite de gastos por mês</h2>
        <p className="mt-1.5 text-2xl font-bold">
          {couple.monthly_limit_cents > 0 ? formatCents(couple.monthly_limit_cents) : '—'}
        </p>
        <p className="mt-1 text-sm text-muted">
          É a meta da barra de progresso na tela inicial.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => {
            setValue(
              couple.monthly_limit_cents > 0
                ? maskAmountInput(String(couple.monthly_limit_cents))
                : '',
            );
            setEditing(true);
          }}
        >
          Alterar limite
        </Button>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold">Limite de gastos por mês</h2>

      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateLimit.mutate(parseAmountToCents(value), {
            onSuccess: () => setEditing(false),
          });
        }}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            R$
          </span>
          <Input
            value={value}
            onChange={(e) => setValue(maskAmountInput(e.target.value))}
            placeholder="0,00"
            inputMode="numeric"
            className="pl-11"
            autoFocus
          />
        </div>

        {updateLimit.isError && <Notice>Não deu para salvar. Tente de novo.</Notice>}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={updateLimit.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </section>
  );
}
