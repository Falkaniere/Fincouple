'use client';

import { useMemo, useRef, useState } from 'react';

import { useImportTransactions } from '@/hooks/use-month-data';
import { guessCategoryId } from '@/lib/import/guess-category';
import { extractRowsFromFile, ImportFileError } from '@/lib/import/read-file';
import { formatCents, maskAmountInput, parseAmountToCents } from '@/lib/money';
import type { MonthKey } from '@/lib/month';
import type { Category } from '@/lib/types';
import { Sheet } from './sheet';
import { Button, Field, Input, Notice, Spinner, cx } from './ui';
import { TrashIcon, UploadIcon } from './icons';

interface DraftRow {
  id: string;
  include: boolean;
  date: string;
  description: string;
  amount: string;
  categoryId: string | null;
}

/**
 * Importa gastos de um extrato (.csv, .xlsx ou .pdf). O arquivo é lido só no
 * navegador -- nada sobe para lugar nenhum antes da pessoa conferir e
 * confirmar cada linha, com data, descrição, valor e categoria já sugeridos.
 */
export function ImportSheet({
  coupleId,
  categories,
  month,
  onClose,
}: {
  coupleId: string;
  categories: Category[];
  month: MonthKey;
  onClose: () => void;
}) {
  const importTransactions = useImportTransactions(coupleId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[] | null>(null);

  const [useBillingMonth, setUseBillingMonth] = useState(false);
  const [billingMonth, setBillingMonth] = useState<MonthKey>(month);

  async function handleFile(file: File) {
    setParsing(true);
    setParseError(null);
    setFileName(file.name);

    try {
      const parsed = await extractRowsFromFile(file, month);
      if (parsed.length === 0) {
        setParseError('Não encontrei nenhum lançamento nesse arquivo. Confira se é o extrato certo.');
        return;
      }

      setRows(
        parsed.map((row) => ({
          id: row.id,
          include: !row.credit,
          date: row.occurredOn,
          description: row.description,
          amount: maskAmountInput(String(row.amountCents)),
          categoryId: guessCategoryId(row.description, categories),
        })),
      );
    } catch (error) {
      setParseError(
        error instanceof ImportFileError
          ? error.message
          : 'Não consegui ler esse arquivo. Confira se é um .csv, .xlsx ou .pdf válido.',
      );
    } finally {
      setParsing(false);
    }
  }

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((current) => current?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? current);
  }

  function removeRow(id: string) {
    setRows((current) => current?.filter((r) => r.id !== id) ?? current);
  }

  function startOver() {
    setRows(null);
    setParseError(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const included = useMemo(() => (rows ?? []).filter((r) => r.include), [rows]);
  const totalCents = useMemo(
    () => included.reduce((sum, r) => sum + parseAmountToCents(r.amount), 0),
    [included],
  );

  function handleSubmit() {
    if (included.length === 0) return;

    importTransactions.mutate(
      {
        rows: included.map((r) => ({
          occurredOn: r.date,
          description: r.description.trim() || null,
          amountCents: parseAmountToCents(r.amount),
          categoryId: r.categoryId,
        })),
        billingMonth: useBillingMonth ? billingMonth : null,
      },
      { onSuccess: onClose },
    );
  }

  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  return (
    <Sheet
      open
      title="Importar gastos"
      onClose={onClose}
      footer={
        rows && (
          <div className="space-y-2">
            {importTransactions.isError && (
              <Notice>Não deu para importar. Confira a conexão e tente de novo.</Notice>
            )}
            <div className="flex items-center justify-between text-sm text-muted">
              <span>
                {included.length} de {rows.length} selecionados
              </span>
              <span className="font-semibold text-text">{formatCents(totalCents)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              loading={importTransactions.isPending}
              disabled={included.length === 0}
              onClick={handleSubmit}
            >
              {included.length > 0
                ? `Importar ${included.length} ${included.length === 1 ? 'lançamento' : 'lançamentos'}`
                : 'Importar'}
            </Button>
          </div>
        )
      }
    >
      {!rows ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Envie o extrato da fatura (.csv, .xlsx ou .pdf) e o app tenta reconhecer a data, a
            descrição, o valor e a categoria de cada gasto. Você confere e ajusta antes de
            importar -- nada entra sem sua confirmação.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:bg-surface-2"
          >
            {parsing ? (
              <>
                <Spinner className="size-6" />
                <span className="text-sm text-muted">Lendo {fileName}...</span>
              </>
            ) : (
              <>
                <UploadIcon className="size-6 text-muted" />
                <span className="text-sm font-medium">Escolher arquivo</span>
              </>
            )}
          </button>

          {parseError && <Notice>{parseError}</Notice>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-3.5">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">São despesas de cartão de crédito</span>
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
                  hint="Todos os lançamentos importados vão contar nesse mês, independente da data de cada um."
                >
                  <input
                    type="month"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text focus:border-brand focus:outline-2 focus:outline-brand/40"
                  />
                </Field>
              </div>
            )}
          </div>

          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cx(
                  'rounded-xl border border-border p-3 transition-opacity',
                  !row.include && 'opacity-50',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateRow(row.id, { include: e.target.checked })}
                    aria-label={row.include ? 'Remover da importação' : 'Incluir na importação'}
                    className="mt-1 size-5 shrink-0 accent-brand"
                  />

                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      maxLength={140}
                      aria-label="Descrição"
                    />

                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.id, { date: e.target.value })}
                        className="flex-1"
                        aria-label="Data"
                      />
                      <div className="relative w-32 shrink-0">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                          R$
                        </span>
                        <Input
                          value={row.amount}
                          onChange={(e) =>
                            updateRow(row.id, { amount: maskAmountInput(e.target.value) })
                          }
                          inputMode="numeric"
                          className="pl-8 text-right"
                          aria-label="Valor"
                        />
                      </div>
                    </div>

                    <select
                      value={row.categoryId ?? ''}
                      onChange={(e) => updateRow(row.id, { categoryId: e.target.value || null })}
                      className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text"
                      aria-label="Categoria"
                    >
                      <option value="">Sem categoria</option>
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label="Apagar linha"
                    className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={startOver}
            className="text-sm font-medium text-brand underline"
          >
            Escolher outro arquivo
          </button>
        </div>
      )}
    </Sheet>
  );
}
