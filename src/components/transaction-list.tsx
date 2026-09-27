'use client';

import { formatCents } from '@/lib/money';
import { formatDayShort } from '@/lib/month';
import type { Category, Transaction } from '@/lib/types';
import { EmptyState, cx } from './ui';

/** Últimos lançamentos do mês. Tocar abre a folha para editar. */
export function TransactionList({
  transactions,
  categories,
  onSelect,
}: {
  transactions: Transaction[];
  categories: Category[];
  onSelect: (transaction: Transaction) => void;
}) {
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <section className="card" aria-label="Lançamentos do mês">
      <h2 className="border-b border-border px-5 py-4 font-semibold">
        Lançamentos
        {transactions.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted">{transactions.length}</span>
        )}
      </h2>

      {transactions.length === 0 ? (
        <EmptyState title="Nada lançado neste mês">
          Tudo que vocês dois lançarem aparece aqui, nos dois celulares.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border">
          {transactions.map((t) => {
            const category = t.category_id ? byId.get(t.category_id) : undefined;
            const income = t.kind === 'income';

            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: income ? 'var(--positive)' : (category?.color ?? '#94a3b8') }}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {t.description?.trim() || category?.name || (income ? 'Receita' : 'Despesa')}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {formatDayShort(t.occurred_on)}
                      {category ? ` · ${category.name}` : ''}
                      {t.installment_total ? ` · ${t.installment_no}/${t.installment_total}` : ''}
                    </span>
                  </span>

                  <span
                    className={cx(
                      'shrink-0 font-semibold',
                      income ? 'text-positive' : 'text-text',
                    )}
                  >
                    {income ? '+' : '−'}
                    {formatCents(t.amount_cents)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
