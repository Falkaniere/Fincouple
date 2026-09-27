'use client';

import { useApp } from './app-shell';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { currentMonthKey, formatMonthShort, shiftMonth } from '@/lib/month';
import { cx } from './ui';

export function MonthSwitcher() {
  const { month, setMonth } = useApp();
  const isCurrent = month === currentMonthKey();

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => setMonth(shiftMonth(month, -1))}
        aria-label="Mês anterior"
        className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2"
      >
        <ChevronLeftIcon className="size-5" />
      </button>

      <div className="text-center">
        <p className="font-semibold">{formatMonthShort(month)}</p>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => setMonth(currentMonthKey())}
            className="text-xs font-medium text-brand"
          >
            voltar para o mês atual
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setMonth(shiftMonth(month, 1))}
        aria-label="Mês seguinte"
        className={cx(
          'flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2',
        )}
      >
        <ChevronRightIcon className="size-5" />
      </button>
    </div>
  );
}
