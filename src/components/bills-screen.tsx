'use client';

import { useMemo, useState } from 'react';

import { useApp } from './app-shell';
import {
  useBills,
  useCreateBill,
  useDeleteBill,
  useToggleBillPaid,
  useUpdateBill,
} from '@/hooks/use-bills';
import { formatCents, maskAmountInput, parseAmountToCents } from '@/lib/money';
import type { Bill } from '@/lib/types';
import { todayISO } from '@/lib/month';
import { BillRow } from './bill-row';
import { Sheet } from './sheet';
import { Button, EmptyState, Field, Input, Notice, Spinner } from './ui';
import { PlusIcon, TrashIcon } from './icons';

export function BillsScreen() {
  const { couple } = useApp();
  const { data: bills, isLoading } = useBills(couple.id);
  const togglePaid = useToggleBillPaid(couple.id);
  const deleteBill = useDeleteBill();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  function openEdit(bill: Bill) {
    setEditingBill(bill);
    setSheetOpen(true);
  }

  function openNew() {
    setEditingBill(null);
    setSheetOpen(true);
  }

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
                          onEdit={() => openEdit(bill)}
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
                          onEdit={() => openEdit(bill)}
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
        onClick={openNew}
        aria-label="Nova conta"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/20 transition-transform active:scale-95"
      >
        <PlusIcon className="size-7" />
      </button>

      {/* A `key` faz a folha remontar ao trocar de conta, então o formulário
          já nasce com os valores certos -- sem efeito de sincronização. */}
      {sheetOpen && (
        <BillSheet
          key={editingBill?.id ?? 'nova'}
          editing={editingBill}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Folha de conta. Monta com uma `key` por conta (veja BillsScreen), então o
 * estado nasce certo pelos inicializadores do useState -- sem efeito de
 * sincronização, como recomenda a documentação do React.
 */
function BillSheet({
  editing,
  onClose,
}: {
  /** Quando vem preenchido, a folha edita em vez de criar. */
  editing: Bill | null;
  onClose: () => void;
}) {
  const { couple } = useApp();
  const createBill = useCreateBill(couple.id);
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();

  const [title, setTitle] = useState(editing?.title ?? '');
  const [amount, setAmount] = useState(() =>
    editing ? maskAmountInput(String(editing.amount_cents)) : '',
  );
  const [dueDate, setDueDate] = useState(() => editing?.due_date ?? todayISO());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const amountCents = parseAmountToCents(amount);
  const pending = createBill.isPending || updateBill.isPending || deleteBill.isPending;
  const failed = createBill.isError || updateBill.isError;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    const input = { title, amountCents, dueDate, categoryId: editing?.category_id ?? null };

    if (editing) {
      updateBill.mutate({ id: editing.id, input }, { onSuccess: onClose });
    } else {
      createBill.mutate(input, { onSuccess: onClose });
    }
  }

  return (
    <Sheet
      open
      title={editing ? 'Editar conta' : 'Nova conta'}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          <Button
            type="submit"
            form="bill-form"
            size="lg"
            className="w-full"
            loading={pending}
            disabled={!title.trim() || amountCents <= 0}
          >
            {editing ? 'Salvar alterações' : 'Adicionar conta'}
          </Button>

          {editing && (
            <div className="border-t border-border pt-3">
              {confirmingDelete ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted">Apagar esta conta?</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Manter
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="flex-1"
                      loading={deleteBill.isPending}
                      onClick={() => deleteBill.mutate(editing.id, { onSuccess: onClose })}
                    >
                      Apagar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-negative"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <TrashIcon className="size-4" />
                  Apagar conta
                </Button>
              )}
            </div>
          )}
        </div>
      }
    >
      <form id="bill-form" className="space-y-4" onSubmit={handleSubmit}>
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

        {failed && <Notice>Não deu para salvar. Confira a conexão e tente de novo.</Notice>}
      </form>
    </Sheet>
  );
}
