'use client';

import { formatCents } from '@/lib/money';
import { cx } from './ui';

/** Card grande do saldo do mês: o primeiro número que a pessoa procura. */
export function BalanceCard({
  balanceCents,
  incomeCents,
  expenseCents,
}: {
  balanceCents: number;
  incomeCents: number;
  expenseCents: number;
}) {
  const negative = balanceCents < 0;

  return (
    <section className="card p-5" aria-label="Saldo do mês">
      <p className="text-sm font-medium text-muted">Saldo do mês</p>
      <p
        className={cx(
          'mt-1 text-4xl font-bold tracking-tight',
          negative ? 'text-negative' : 'text-text',
        )}
      >
        {formatCents(balanceCents)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-xs font-medium text-muted">Entrou</p>
          <p className="mt-0.5 font-semibold text-positive">{formatCents(incomeCents)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted">Saiu</p>
          <p className="mt-0.5 font-semibold text-negative">{formatCents(expenseCents)}</p>
        </div>
      </div>
    </section>
  );
}
