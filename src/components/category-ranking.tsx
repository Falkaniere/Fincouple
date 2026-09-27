'use client';

import { formatCents } from '@/lib/money';
import type { CategoryTotal } from '@/lib/types';
import { EmptyState } from './ui';

/** Onde o dinheiro foi, do maior gasto para o menor. */
export function CategoryRanking({ ranking }: { ranking: CategoryTotal[] }) {
  if (ranking.length === 0) {
    return (
      <section className="card">
        <h2 className="border-b border-border px-5 py-4 font-semibold">Gastos por categoria</h2>
        <EmptyState title="Nenhuma despesa neste mês">
          Toque no + para lançar o primeiro gasto.
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Gastos por categoria">
      <h2 className="border-b border-border px-5 py-4 font-semibold">Gastos por categoria</h2>

      <ol className="divide-y divide-border">
        {ranking.map((row) => (
          <li key={row.categoryId ?? 'sem-categoria'} className="px-5 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: row.color }}
                />
                <span className="truncate font-medium">{row.name}</span>
              </span>
              <span className="shrink-0 font-semibold">{formatCents(row.cents)}</span>
            </div>

            <div className="mt-2 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${row.share * 100}%`, background: row.color }}
                />
              </div>
              <span className="w-9 shrink-0 text-right text-xs font-medium text-muted">
                {Math.round(row.share * 100)}%
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
