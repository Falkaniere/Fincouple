import writeXlsxFile from 'write-excel-file/browser';

import { formatDateBR } from '../month';
import { buildExportPayload, categoryName, exportFileName, type ExportPayload } from './data';
import type { Bill, Category, Couple, Transaction } from '../types';
import type { MonthKey } from '../month';

/** Valores vão como número em reais, com formato de moeda, para dar para somar. */
const MONEY_FORMAT = 'R$ #,##0.00';

const HEADER = { fontWeight: 'bold', backgroundColor: '#E8F5F3' } as const;

function reais(cents: number): number {
  return cents / 100;
}

/**
 * Gera a planilha do mês com três abas: Lançamentos, Resumo por categoria e
 * Contas. Roda inteiramente no navegador, sem passar pelo servidor.
 */
export async function exportMonthToXlsx(input: {
  couple: Couple;
  month: MonthKey;
  transactions: Transaction[];
  categories: Category[];
  bills: Bill[];
}): Promise<void> {
  const payload = buildExportPayload(input);

  // `toFile` monta o arquivo e dispara o download no navegador.
  await writeXlsxFile(
    [
      { ...transactionsSheet(payload), sheet: 'Lançamentos' },
      { ...summarySheet(payload), sheet: 'Resumo' },
      { ...billsSheet(payload), sheet: 'Contas' },
    ],
    { fontFamily: 'Calibri', fontSize: 11 },
  ).toFile(exportFileName(payload.month, 'xlsx'));
}

function transactionsSheet(payload: ExportPayload) {
  const rows = [
    [
      { value: 'Data', ...HEADER },
      { value: 'Tipo', ...HEADER },
      { value: 'Categoria', ...HEADER },
      { value: 'Descrição', ...HEADER },
      { value: 'Valor', ...HEADER },
    ],
    ...payload.transactions.map((t) => [
      { value: formatDateBR(t.occurred_on), type: String },
      { value: t.kind === 'income' ? 'Receita' : 'Despesa', type: String },
      { value: categoryName(payload, t.category_id), type: String },
      { value: t.description ?? '', type: String },
      // Despesa entra negativa para a coluna somar direto no saldo.
      {
        value: t.kind === 'income' ? reais(t.amount_cents) : -reais(t.amount_cents),
        type: Number,
        format: MONEY_FORMAT,
      },
    ]),
    [],
    [
      { value: 'Saldo do mês', ...HEADER },
      null,
      null,
      null,
      {
        value: reais(payload.summary.balanceCents),
        type: Number,
        format: MONEY_FORMAT,
        fontWeight: 'bold' as const,
      },
    ],
  ];

  return {
    data: rows,
    columns: [{ width: 12 }, { width: 10 }, { width: 20 }, { width: 34 }, { width: 14 }],
  };
}

function summarySheet(payload: ExportPayload) {
  const { summary, couple, monthLabel } = payload;

  const rows = [
    [{ value: `Fincouple — ${couple.name}`, ...HEADER }, null],
    [{ value: 'Mês', type: String }, { value: monthLabel, type: String }],
    [],
    [{ value: 'Receitas', type: String }, { value: reais(summary.incomeCents), type: Number, format: MONEY_FORMAT }],
    [{ value: 'Despesas', type: String }, { value: reais(summary.expenseCents), type: Number, format: MONEY_FORMAT }],
    [
      { value: 'Saldo', type: String, fontWeight: 'bold' as const },
      {
        value: reais(summary.balanceCents),
        type: Number,
        format: MONEY_FORMAT,
        fontWeight: 'bold' as const,
      },
    ],
    [
      { value: 'Limite do mês', type: String },
      { value: reais(couple.monthly_limit_cents), type: Number, format: MONEY_FORMAT },
    ],
    [],
    [
      { value: 'Categoria', ...HEADER },
      { value: 'Gasto', ...HEADER },
      { value: '% do total', ...HEADER },
    ],
    ...summary.ranking.map((row) => [
      { value: row.name, type: String },
      { value: reais(row.cents), type: Number, format: MONEY_FORMAT },
      { value: row.share, type: Number, format: '0.0%' },
    ]),
  ];

  return { data: rows, columns: [{ width: 24 }, { width: 14 }, { width: 12 }] };
}

function billsSheet(payload: ExportPayload) {
  const all = [...payload.openBills, ...payload.paidBills].sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  );

  const rows = [
    [
      { value: 'Conta', ...HEADER },
      { value: 'Vencimento', ...HEADER },
      { value: 'Valor', ...HEADER },
      { value: 'Situação', ...HEADER },
    ],
    ...all.map((b) => [
      { value: b.title, type: String },
      { value: formatDateBR(b.due_date), type: String },
      { value: reais(b.amount_cents), type: Number, format: MONEY_FORMAT },
      { value: b.paid_at ? 'Paga' : 'Em aberto', type: String },
    ]),
  ];

  return { data: rows, columns: [{ width: 28 }, { width: 14 }, { width: 14 }, { width: 12 }] };
}
