'use client';

import { formatCents } from '@/lib/money';
import { daysUntil, formatDateBR } from '@/lib/month';
import type { Bill } from '@/lib/types';
import { CheckIcon, TrashIcon } from './icons';
import { cx } from './ui';

/** Texto do vencimento em linguagem de gente. */
function dueLabel(bill: Bill): { text: string; late: boolean } {
  const days = daysUntil(bill.due_date);

  if (days < 0) {
    const late = Math.abs(days);
    return { text: `Venceu há ${late} ${late === 1 ? 'dia' : 'dias'}`, late: true };
  }
  if (days === 0) return { text: 'Vence hoje', late: false };
  if (days === 1) return { text: 'Vence amanhã', late: false };
  if (days <= 7) return { text: `Vence em ${days} dias`, late: false };
  return { text: `Vence ${formatDateBR(bill.due_date)}`, late: false };
}

export function BillRow({
  bill,
  onTogglePaid,
  onDelete,
}: {
  bill: Bill;
  onTogglePaid: () => void;
  onDelete: () => void;
}) {
  const paid = bill.paid_at !== null;
  const due = dueLabel(bill);

  return (
    <li
      className={cx(
        'flex items-center gap-3 px-4 py-3.5 transition-colors',
        // Paga: a linha inteira fica verde. O estado se lê de longe.
        paid && 'bg-positive-soft',
      )}
    >
      <button
        type="button"
        onClick={onTogglePaid}
        aria-pressed={paid}
        aria-label={paid ? `Marcar ${bill.title} como não paga` : `Marcar ${bill.title} como paga`}
        className={cx(
          'flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-95',
          paid
            ? 'border-positive bg-positive text-white'
            : 'border-border bg-surface text-transparent hover:border-positive',
        )}
      >
        <CheckIcon className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className={cx('truncate font-medium', paid && 'text-muted line-through')}>
          {bill.title}
        </p>
        <p
          className={cx(
            'truncate text-xs',
            paid ? 'text-positive' : due.late ? 'text-negative font-medium' : 'text-muted',
          )}
        >
          {paid ? 'Paga' : due.text}
        </p>
      </div>

      <p className={cx('shrink-0 font-semibold', paid && 'text-muted line-through')}>
        {formatCents(bill.amount_cents)}
      </p>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Apagar ${bill.title}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-negative"
      >
        <TrashIcon className="size-4" />
      </button>
    </li>
  );
}
