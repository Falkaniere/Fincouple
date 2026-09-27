'use client';

import { useState } from 'react';

import { useApp } from './app-shell';
import { useBills } from '@/hooks/use-bills';
import { useCategories, useTransactions } from '@/hooks/use-month-data';
import { formatMonthLong } from '@/lib/month';
import { Button, Notice } from './ui';
import { PdfIcon, SheetIcon } from './icons';

/**
 * Exportação do mês selecionado. As bibliotecas de Excel e PDF são carregadas
 * só no clique (import dinâmico), para não pesar no primeiro carregamento.
 */
export function ExportButtons() {
  const { couple, month } = useApp();
  const { data: transactions } = useTransactions(couple.id, month);
  const { data: categories } = useCategories(couple.id);
  const { data: bills } = useBills(couple.id);

  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = transactions && categories && bills;

  async function run(kind: 'xlsx' | 'pdf') {
    if (!ready) return;
    setBusy(kind);
    setError(null);

    const input = {
      couple,
      month,
      transactions,
      categories,
      bills,
    };

    try {
      if (kind === 'xlsx') {
        const { exportMonthToXlsx } = await import('@/lib/export/xlsx');
        await exportMonthToXlsx(input);
      } else {
        const { exportMonthToPdf } = await import('@/lib/export/pdf');
        exportMonthToPdf(input);
      }
    } catch {
      setError('Não deu para gerar o arquivo. Tente de novo.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold">Exportar</h2>
      <p className="mt-1 text-sm text-muted">
        Baixa os lançamentos, o resumo por categoria e as contas de{' '}
        <strong className="text-text">{formatMonthLong(month)}</strong>.
      </p>

      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          loading={busy === 'xlsx'}
          disabled={!ready || busy !== null}
          onClick={() => void run('xlsx')}
        >
          <SheetIcon className="size-4" />
          Planilha
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          loading={busy === 'pdf'}
          disabled={!ready || busy !== null}
          onClick={() => void run('pdf')}
        >
          <PdfIcon className="size-4" />
          PDF
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Notice>{error}</Notice>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Para exportar outro mês, troque o mês na tela inicial.
      </p>
    </section>
  );
}
