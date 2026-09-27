'use client';

import { useState } from 'react';

import { useApp } from './app-shell';
import { useCategories, useMonthSummary, useTransactions } from '@/hooks/use-month-data';
import type { Transaction } from '@/lib/types';
import { BalanceCard } from './balance-card';
import { CategoryRanking } from './category-ranking';
import { LimitProgress } from './limit-progress';
import { MonthSwitcher } from './month-switcher';
import { TransactionList } from './transaction-list';
import { TransactionSheet } from './transaction-sheet';
import { PlusIcon } from './icons';
import { Spinner } from './ui';

export function HomeScreen() {
  const { couple, month } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const { data: categories } = useCategories(couple.id);
  const { data: transactions, isLoading } = useTransactions(couple.id, month);
  const summary = useMonthSummary(transactions, categories);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setSheetOpen(true);
  }

  return (
    <>
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <MonthSwitcher />
      </header>

      <div className="space-y-3 px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7" />
          </div>
        ) : (
          <>
            <BalanceCard
              balanceCents={summary.balanceCents}
              incomeCents={summary.incomeCents}
              expenseCents={summary.expenseCents}
            />

            <LimitProgress
              expenseCents={summary.expenseCents}
              limitCents={couple.monthly_limit_cents}
            />

            <CategoryRanking ranking={summary.ranking} />

            <TransactionList
              transactions={transactions ?? []}
              categories={categories ?? []}
              onSelect={openEdit}
            />
          </>
        )}
      </div>

      {/* Botão flutuante: a ação mais frequente do app fica sempre ao alcance
          do polegar. */}
      <button
        type="button"
        onClick={openNew}
        aria-label="Novo lançamento"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/20 transition-transform active:scale-95"
      >
        <PlusIcon className="size-7" />
      </button>

      {/* A `key` faz a folha remontar ao trocar de lançamento, então o
          formulário já nasce com os valores certos. */}
      {sheetOpen && (
        <TransactionSheet
          key={editing?.id ?? 'novo'}
          coupleId={couple.id}
          categories={categories ?? []}
          editing={editing}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
