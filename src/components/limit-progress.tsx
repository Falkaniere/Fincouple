'use client';

import Link from 'next/link';

import { formatCents } from '@/lib/money';
import { limitProgress } from '@/lib/summary';
import { cx } from './ui';

/**
 * Barra gasto/limite do mês. Muda de cor em 80% (atenção) e ao passar de 100%
 * (estourou), porque a cor é lida antes do número.
 */
export function LimitProgress({
  expenseCents,
  limitCents,
}: {
  expenseCents: number;
  limitCents: number;
}) {
  if (limitCents <= 0) {
    return (
      <section className="card p-5">
        <p className="text-sm font-medium text-muted">Limite do mês</p>
        <p className="mt-1.5 text-sm">
          Vocês ainda não definiram um limite.{' '}
          <Link href="/ajustes" className="font-semibold text-brand underline">
            Definir agora
          </Link>
        </p>
      </section>
    );
  }

  const ratio = limitProgress(expenseCents, limitCents);
  const percent = Math.round(ratio * 100);
  const over = ratio > 1;
  const nearing = ratio >= 0.8 && !over;
  const remaining = limitCents - expenseCents;

  const barColor = over ? 'bg-negative' : nearing ? 'bg-warning' : 'bg-brand';
  const labelColor = over ? 'text-negative' : nearing ? 'text-warning' : 'text-text';

  return (
    <section className="card p-5" aria-label="Limite de gastos do mês">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-muted">Limite do mês</p>
        <p className={cx('text-sm font-bold', labelColor)}>{percent}%</p>
      </div>

      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
        aria-valuetext={`${formatCents(expenseCents)} de ${formatCents(limitCents)}`}
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-500', barColor)}
          // Acima de 100% a barra enche e a mensagem abaixo dá o tamanho do estouro.
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>

      <p className="mt-2.5 text-sm text-muted">
        <span className="font-semibold text-text">{formatCents(expenseCents)}</span> de{' '}
        {formatCents(limitCents)}
      </p>

      <p className={cx('mt-0.5 text-sm font-medium', labelColor)}>
        {over
          ? `Passou ${formatCents(-remaining)} do limite.`
          : `Ainda dá para gastar ${formatCents(remaining)}.`}
      </p>
    </section>
  );
}
