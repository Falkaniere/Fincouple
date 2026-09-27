'use client';

import { useMemo, useState } from 'react';

import { useApp } from './app-shell';
import { useBills, useCreateBill, useDeleteBill, useToggleBillPaid } from '@/hooks/use-bills';
import { formatCents, maskAmountInput, parseAmountToCents } from '@/lib/money';
import { todayISO } from '@/lib/month';
import { BillRow } from './bill-row';
import { Sheet } from './sheet';
import { Button, EmptyState, Field, Input, Notice, Spinner } from './ui';
import { PlusIcon } from './icons';

export function BillsScreen() {
  const { couple } = useApp();
  const { data: bills, isLoading } = useBills(couple.id);
  const togglePaid = useToggleBillPaid(couple.id);
  const deleteBill = useDeleteBill();

  const [sheetOpen, setSheetOpen] = useState(false);

  const { open, paid, openTotal } = useMemo(() => {
    const all = bills ?? [];
    const openBills = all.filter((b) => b.paid_at === null);
    return {
      open: openBills,
      paid: all.filter((b) => b.paid_at !== null),
      openTotal: openBills.reduce((sum, b) => sum + b.amount_cents, 0),
    };
  }, [bills]);

  return (
    <>
      <header className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="text-2xl font-bold">Contas a pagar</h1>
      </header>

      <div className="space-y-3 px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7" />
          </div>
        ) : (
          <>
            <section className="card p-5">
              <p className="text-sm font-medium text-muted">Em aberto</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{formatCents(openTotal)}</p>
              <p className="mt-1 text-sm text-muted">
                {open.length === 0
                  ? 'Nenhuma conta esperando.'
                  : `${open.length} ${open.length === 1 ? 'conta' : 'contas'} para pagar.`}
              </p>
            </section>

            {open.length === 0 && paid.length === 0 ? (
              <section className="card">
                <EmptyState title="Nenhuma conta cadastrada">
                  Adicione o aluguel, a luz, a internet — e vá marcando conforme pagam.
                </EmptyState>
              </section>
            ) : (
              <>
                {open.length > 0 && (
                  <section className="card overflow-hidden">
                    <h2 className="border-b border-border px-4 py-3.5 font-semibold">
                      A pagar
                    </h2>
                    <ul className="divide-y divide-border">
                      {open.map((bill) => (
                        <BillRow
                          key={bill.id}
                          bill={bill}
                          onTogglePaid={() => togglePaid.mutate({ bill })}
                          onDelete={() => deleteBill.mutate(bill.id)}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {paid.length > 0 && (
                  <section className="card overflow-hidden">
                    <h2 className="border-b border-border px-4 py-3.5 font-semibold">
                      Pagas
                      <span className="ml-2 text-sm font-normal text-muted">{paid.length}</span>
                    </h2>
                    <ul className="divide-y divide-border">
                      {paid.map((bill) => (
                        <BillRow
                          key={bill.id}
                          bill={bill}
                          onTogglePaid={() => togglePaid.mutate({ bill })}
                          onDelete={() => deleteBill.mutate(bill.id)}
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="Nova conta"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/20 transition-transform active:scale-95"
      >
        <PlusIcon className="size-7" />
      </button>

      {/* Montar só quando aberta faz o formulário nascer limpo a cada vez. */}
      {sheetOpen && <BillSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}

function BillSheet({ onClose }: { onClose: () => void }) {
  const { couple } = useApp();
  const createBill = useCreateBill(couple.id);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() => todayISO());

  const amountCents = parseAmountToCents(amount);

  return (
    <Sheet open title="Nova conta" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;

          createBill.mutate(
            { title, amountCents, dueDate, categoryId: null },
            { onSuccess: onClose },
          );
        }}
      >
        <Field label="Conta">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Luz"
            maxLength={80}
            autoFocus
            required
          />
        </Field>

        <Field label="Valor">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
              R$
            </span>
            <Input
              value={amount}
              onChange={(e) => setAmount(maskAmountInput(e.target.value))}
              placeholder="0,00"
              inputMode="numeric"
              className="pl-11"
            />
          </div>
        </Field>

        <Field label="Vencimento">
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </Field>

        {createBill.isError && <Notice>Não deu para salvar. Tente de novo.</Notice>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={createBill.isPending}
          disabled={!title.trim()}
        >
          Adicionar conta
        </Button>
      </form>
    </Sheet>
  );
}
