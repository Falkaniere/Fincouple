'use client';

import { useState } from 'react';

import {
  useCreateInstallmentPurchase,
  useCreateTransaction,
  useDeleteInstallmentsFrom,
  useDeleteTransaction,
  useRenumberInstallments,
  useUpdateTransaction,
  type TransactionInput,
} from '@/hooks/use-month-data';
import {
  buildInstallments,
  isValidInstallmentCount,
  isValidStartingInstallment,
  totalOfInstallments,
} from '@/lib/installments';
import { formatCents, maskAmountInput, parseAmountToCents } from '@/lib/money';
import { formatMonthShort, shiftMonth, todayISO, type MonthKey } from '@/lib/month';
import type { Category, Kind, Transaction } from '@/lib/types';
import { CategoryPicker } from './category-picker';
import { Sheet } from './sheet';
import { Button, Field, Input, Notice, cx } from './ui';
import { TrashIcon } from './icons';

const MIN_INSTALLMENTS = 2;
const MAX_INSTALLMENTS = 24;

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
  const [confirmingDelete, setConfirmingDelete] = useState<'one' | 'from-here' | null>(null);

  // Parcelamento só se aplica a uma despesa nova -- não dá para "parcelar"
  // depois de já ter lançado, nem faz sentido numa receita.
  const [parceling, setParceling] = useState(false);
  const [installments, setInstallments] = useState(3);
  // Compra que já vinha sendo paga antes de entrar no app: diz que já é a
  // 8ª de 12, por exemplo, e só cria as parcelas que faltam.
  const [startInstallmentNo, setStartInstallmentNo] = useState(1);

  // Numeração de uma parcela já lançada -- editável para corrigir uma compra
  // que entrou com o total ou o número errado. Corrige o grupo inteiro, as
  // parcelas que já passaram e as que ainda vêm.
  const [editNo, setEditNo] = useState(() => editing?.installment_no ?? 1);
  const [editTotal, setEditTotal] = useState(() => editing?.installment_total ?? 2);

  // Mês da fatura: uma compra de cartão pode contar num mês diferente do
  // da data, porque a fatura já fechou. Cada cartão vira num dia diferente,
  // então o app só sugere o mês seguinte -- quem decide é a pessoa.
  const [useBillingMonth, setUseBillingMonth] = useState(() => editing?.billing_month != null);
  const [billingMonth, setBillingMonth] = useState<MonthKey>(() =>
    editing?.billing_month
      ? editing.billing_month.slice(0, 7)
      : shiftMonth((editing?.occurred_on ?? todayISO()).slice(0, 7), 1),
  );

  const createTransaction = useCreateTransaction(coupleId);
  const createInstallmentPurchase = useCreateInstallmentPurchase(coupleId);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const deleteInstallmentsFrom = useDeleteInstallmentsFrom();
  const renumberInstallments = useRenumberInstallments();

  const amountCents = parseAmountToCents(amount);
  const isExpense = kind === 'expense';
  const isNewExpense = !editing && isExpense;
  const willParcel =
    isNewExpense &&
    parceling &&
    isValidInstallmentCount(installments) &&
    isValidStartingInstallment(startInstallmentNo, installments);
  const billingMonthValue = isExpense && useBillingMonth ? billingMonth : null;

  // `amount` já É o valor de cada parcela aqui -- nada é dividido. O total
  // (mostrado abaixo) é só multiplicação, então nunca perde nem inventa centavo.
  const preview =
    willParcel && amountCents > 0
      ? buildInstallments(amountCents, installments, date, startInstallmentNo)
      : null;

  const editingInstallment =
    editing?.installment_total !== null && editing?.installment_total !== undefined
      ? { no: editing.installment_no!, total: editing.installment_total }
      : null;

  const numberingChanged =
    editingInstallment !== null &&
    (editNo !== editingInstallment.no || editTotal !== editingInstallment.total);
  const numberingValid = isValidStartingInstallment(editNo, editTotal) && editTotal >= 2;

  const pending =
    createTransaction.isPending ||
    createInstallmentPurchase.isPending ||
    updateTransaction.isPending ||
    deleteTransaction.isPending ||
    deleteInstallmentsFrom.isPending ||
    renumberInstallments.isPending;
  const failed =
    createTransaction.isError ||
    createInstallmentPurchase.isError ||
    updateTransaction.isError ||
    renumberInstallments.isError;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (amountCents <= 0) return;

    if (willParcel) {
      createInstallmentPurchase.mutate(
        {
          amountCentsPerInstallment: amountCents,
          installmentCount: installments,
          startInstallmentNo,
          firstOccurredOn: date,
          categoryId,
          description: description.trim() || null,
          firstBillingMonth: billingMonthValue,
        },
        { onSuccess: onClose },
      );
      return;
    }

    if (editingInstallment && numberingChanged && !numberingValid) return;

    const input: TransactionInput = {
      kind,
      amountCents,
      occurredOn: date,
      categoryId,
      description: description.trim() || null,
      billingMonth: billingMonthValue,
    };

    try {
      if (editing) {
        if (editingInstallment && numberingChanged) {
          await renumberInstallments.mutateAsync({
            group: editing.installment_group!,
            oldNo: editingInstallment.no,
            newNo: editNo,
            newTotal: editTotal,
          });
        }
        await updateTransaction.mutateAsync({ id: editing.id, input });
      } else {
        await createTransaction.mutateAsync(input);
      }
      onClose();
    } catch {
      // O erro já fica visível pelo `failed` acima -- a pessoa tenta de novo.
    }
  }

  return (
    <Sheet
      open
      title={editing ? 'Editar lançamento' : 'Novo lançamento'}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          <Button
            type="submit"
            form="transaction-form"
            size="lg"
            className="w-full"
            loading={pending}
            disabled={
              amountCents <= 0 || (editingInstallment !== null && numberingChanged && !numberingValid)
            }
          >
            {editing
              ? 'Salvar alterações'
              : willParcel
                ? startInstallmentNo > 1
                  ? `Lançar parcelas ${startInstallmentNo} a ${installments}`
                  : `Lançar em ${installments}x`
                : 'Lançar'}
          </Button>

          {editing && (
            <div className="space-y-2 border-t border-border pt-3">
              {confirmingDelete ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    {confirmingDelete === 'from-here'
                      ? `Apagar esta e as parcelas seguintes (${editingInstallment?.no} a ${editingInstallment?.total})?`
                      : 'Apagar este lançamento?'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setConfirmingDelete(null)}
                    >
                      Manter
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="flex-1"
                      loading={deleteTransaction.isPending || deleteInstallmentsFrom.isPending}
                      onClick={() =>
                        confirmingDelete === 'from-here'
                          ? deleteInstallmentsFrom.mutate(editing, { onSuccess: onClose })
                          : deleteTransaction.mutate(editing.id, { onSuccess: onClose })
                      }
                    >
                      Apagar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-negative"
                    onClick={() => setConfirmingDelete('one')}
                  >
                    <TrashIcon className="size-4" />
                    Apagar lançamento
                  </Button>

                  {editingInstallment && editingInstallment.no < editingInstallment.total && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-negative"
                      onClick={() => setConfirmingDelete('from-here')}
                    >
                      <TrashIcon className="size-4" />
                      Apagar esta e as parcelas seguintes
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit} className="space-y-5">
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
                // A categoria selecionada não serve para o outro tipo, e
                // parcelamento só existe para despesa.
                setCategoryId(null);
                if (option === 'income') {
                  setParceling(false);
                  setUseBillingMonth(false);
                }
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

        {editingInstallment && (
          <div className="rounded-xl border border-border p-3.5">
            <p className="text-sm font-medium">Numeração da parcela</p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-muted">Esta é a parcela nº</span>
              <Stepper
                value={editNo}
                min={1}
                max={editTotal}
                onChange={setEditNo}
                ariaLabelDecrease="Parcela anterior"
                ariaLabelIncrease="Parcela seguinte"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-muted">de um total de</span>
              <Stepper
                value={editTotal}
                min={Math.max(2, editNo)}
                max={MAX_INSTALLMENTS}
                onChange={setEditTotal}
                ariaLabelDecrease="Menos parcelas no total"
                ariaLabelIncrease="Mais parcelas no total"
              />
            </div>

            <p className="mt-2.5 text-xs text-muted">
              {numberingChanged
                ? 'Corrige a numeração de todas as parcelas dessa compra ao salvar -- as que já passaram e as que ainda vêm.'
                : 'Errou o número quando lançou? Corrigir aqui ajusta a compra inteira, parcelas passadas e futuras.'}
            </p>

            {numberingChanged && !numberingValid && (
              <p className="mt-1.5 text-xs text-warning">
                A parcela não pode ser maior que o total.
              </p>
            )}
          </div>
        )}

        {/* Valor */}
        <div>
          <label htmlFor="valor" className="mb-1.5 block text-sm font-medium text-muted">
            {willParcel ? 'Valor de cada parcela' : 'Valor'}
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

        {isNewExpense && (
          <div className="rounded-xl border border-border p-3.5">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Parcelar essa compra</span>
              <input
                type="checkbox"
                checked={parceling}
                onChange={(e) => setParceling(e.target.checked)}
                className="size-5 accent-brand"
              />
            </label>

            {parceling && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted">Número de parcelas</span>
                  <Stepper
                    value={installments}
                    min={MIN_INSTALLMENTS}
                    max={MAX_INSTALLMENTS}
                    suffix="x"
                    onChange={(next) => {
                      setInstallments(next);
                      setStartInstallmentNo((no) => Math.min(no, next));
                    }}
                    ariaLabelDecrease="Menos parcelas"
                    ariaLabelIncrease="Mais parcelas"
                  />
                </div>

                <label className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <span className="text-sm text-muted">Já vinha pagando antes de lançar aqui</span>
                  <input
                    type="checkbox"
                    checked={startInstallmentNo > 1}
                    onChange={(e) => setStartInstallmentNo(e.target.checked ? 2 : 1)}
                    className="size-5 accent-brand"
                  />
                </label>

                {startInstallmentNo > 1 && (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">Essa vai ser a parcela nº</span>
                    <Stepper
                      value={startInstallmentNo}
                      min={2}
                      max={installments}
                      onChange={setStartInstallmentNo}
                      ariaLabelDecrease="Parcela inicial anterior"
                      ariaLabelIncrease="Parcela inicial seguinte"
                    />
                  </div>
                )}

                {preview && (
                  <p className="mt-2.5 text-sm text-muted">
                    {startInstallmentNo > 1 ? (
                      <>
                        Cria as parcelas {startInstallmentNo} a {installments} (
                        {preview.length}x de {formatCents(amountCents)}), começando em{' '}
                        {preview[0].occurredOn.split('-').reverse().join('/')}.
                      </>
                    ) : (
                      <>
                        {installments}x de {formatCents(amountCents)} ={' '}
                        <strong className="text-text">
                          {formatCents(totalOfInstallments(amountCents, installments))}
                        </strong>{' '}
                        no total, começando em {preview[0].occurredOn.split('-').reverse().join('/')}
                        .
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {isExpense && (
          <div className="rounded-xl border border-border p-3.5">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">É despesa de cartão de crédito</span>
              <input
                type="checkbox"
                checked={useBillingMonth}
                onChange={(e) => setUseBillingMonth(e.target.checked)}
                className="size-5 accent-brand"
              />
            </label>

            {useBillingMonth && (
              <div className="mt-3 border-t border-border pt-3">
                <Field
                  label="Mês da fatura"
                  hint="Cada cartão fecha num dia diferente, então é você quem escolhe. Ex.: comprou dia 27 mas a fatura já fechou -- marque o mês em que ela vai contar."
                >
                  <input
                    type="month"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text focus:border-brand focus:outline-2 focus:outline-brand/40"
                  />
                </Field>

                <p className="mt-2.5 text-sm text-muted">
                  Vai contar no saldo de{' '}
                  <strong className="text-text">{formatMonthShort(billingMonth)}</strong>
                  {billingMonth !== date.slice(0, 7) && `, não em ${formatMonthShort(date.slice(0, 7))}`}
                  .
                </p>
              </div>
            )}
          </div>
        )}

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
      </form>
    </Sheet>
  );
}

/** Botões -/+ com o valor no meio, para número de parcelas e afins. */
function Stepper({
  value,
  min,
  max,
  suffix = '',
  onChange,
  ariaLabelDecrease,
  ariaLabelIncrease,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
  ariaLabelDecrease: string;
  ariaLabelIncrease: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={ariaLabelDecrease}
        className="flex size-9 items-center justify-center rounded-full border border-border text-lg font-semibold"
      >
        −
      </button>
      <span className="w-10 text-center text-lg font-bold tabular-nums">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={ariaLabelIncrease}
        className="flex size-9 items-center justify-center rounded-full border border-border text-lg font-semibold"
      >
        +
      </button>
    </div>
  );
}
