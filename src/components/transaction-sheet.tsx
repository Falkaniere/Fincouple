'use client';

import { useState } from 'react';

import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
  type TransactionInput,
} from '@/hooks/use-month-data';
import { maskAmountInput, parseAmountToCents } from '@/lib/money';
import { todayISO } from '@/lib/month';
import type { Category, Kind, Transaction } from '@/lib/types';
import { CategoryPicker } from './category-picker';
import { Sheet } from './sheet';
import { Button, Field, Input, Notice, cx } from './ui';
import { TrashIcon } from './icons';

/**
 * Folha de lançamento.
 *
 * Quem renderiza monta este componente com uma `key` por lançamento, então o
 * estado do formulário nasce certo pelos inicializadores do useState — sem
 * efeito de sincronização, como recomenda a documentação do React.
 */
export function TransactionSheet({
  coupleId,
  categories,
  editing,
  onClose,
}: {
  coupleId: string;
  categories: Category[];
  /** Quando vem preenchido, a folha edita em vez de criar. */
  editing: Transaction | null;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>(editing?.kind ?? 'expense');
  const [amount, setAmount] = useState(() =>
    editing ? maskAmountInput(String(editing.amount_cents)) : '',
  );
  const [date, setDate] = useState(() => editing?.occurred_on ?? todayISO());
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const createTransaction = useCreateTransaction(coupleId);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const amountCents = parseAmountToCents(amount);
  const pending =
    createTransaction.isPending || updateTransaction.isPending || deleteTransaction.isPending;
  const failed = createTransaction.isError || updateTransaction.isError;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (amountCents <= 0) return;

    const input: TransactionInput = {
      kind,
      amountCents,
      occurredOn: date,
      categoryId,
      description: description.trim() || null,
    };

    if (editing) {
      updateTransaction.mutate({ id: editing.id, input }, { onSuccess: onClose });
    } else {
      createTransaction.mutate(input, { onSuccess: onClose });
    }
  }

  return (
    <Sheet open title={editing ? 'Editar lançamento' : 'Novo lançamento'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Despesa / Receita */}
        <div
          role="radiogroup"
          aria-label="Tipo de lançamento"
          className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1"
        >
          {(
            [
              ['expense', 'Despesa'],
              ['income', 'Receita'],
            ] as const
          ).map(([option, label]) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={kind === option}
              onClick={() => {
                setKind(option);
                // A categoria selecionada não serve para o outro tipo.
                setCategoryId(null);
              }}
              className={cx(
                'min-h-11 rounded-lg text-sm font-semibold transition-colors',
                kind === option
                  ? option === 'income'
                    ? 'bg-surface text-positive shadow-sm'
                    : 'bg-surface text-negative shadow-sm'
                  : 'text-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div>
          <label htmlFor="valor" className="mb-1.5 block text-sm font-medium text-muted">
            Valor
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted">
              R$
            </span>
            <input
              id="valor"
              // inputMode numeric abre o teclado de números no celular; a
              // máscara trata os dígitos como centavos.
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(maskAmountInput(e.target.value))}
              placeholder="0,00"
              autoFocus={!editing}
              className="w-full rounded-xl border border-border bg-surface py-4 pl-14 pr-4 text-right text-3xl font-bold tracking-tight focus:border-brand focus:outline-2 focus:outline-brand/40"
            />
          </div>
        </div>

        <CategoryPicker
          coupleId={coupleId}
          categories={categories}
          kind={kind}
          value={categoryId}
          onChange={setCategoryId}
        />

        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>

        <Field label="Descrição (opcional)">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Compra do mês"
            maxLength={140}
          />
        </Field>

        {failed && <Notice>Não deu para salvar. Confira a conexão e tente de novo.</Notice>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pending}
          disabled={amountCents <= 0}
        >
          {editing ? 'Salvar alterações' : 'Lançar'}
        </Button>

        {editing && (
          <div className="border-t border-border pt-4">
            {confirmingDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">Apagar este lançamento?</p>
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
                    loading={deleteTransaction.isPending}
                    onClick={() =>
                      deleteTransaction.mutate(editing.id, { onSuccess: onClose })
                    }
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
                Apagar lançamento
              </Button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}
