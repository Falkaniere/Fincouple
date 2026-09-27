import { formatMonthLong, type MonthKey } from '../month';
import { summarizeMonth, type MonthSummary } from '../summary';
import type { Bill, Category, Couple, Transaction } from '../types';

/** Tudo que as exportações precisam, montado uma vez e usado por Excel e PDF. */
export interface ExportPayload {
  couple: Couple;
  month: MonthKey;
  monthLabel: string;
  summary: MonthSummary;
  /** Lançamentos do mês, do mais antigo para o mais novo (ordem de extrato). */
  transactions: Transaction[];
  categoriesById: Map<string, Category>;
  openBills: Bill[];
  paidBills: Bill[];
}

export function buildExportPayload(input: {
  couple: Couple;
  month: MonthKey;
  transactions: Transaction[];
  categories: Category[];
  bills: Bill[];
}): ExportPayload {
  const { couple, month, transactions, categories, bills } = input;

  return {
    couple,
    month,
    monthLabel: formatMonthLong(month),
    summary: summarizeMonth(transactions, categories),
    // Na tela a lista é do mais novo para o mais antigo; numa planilha ou num
    // PDF a leitura natural é cronológica.
    transactions: [...transactions].sort((a, b) =>
      a.occurred_on.localeCompare(b.occurred_on) || a.created_at.localeCompare(b.created_at),
    ),
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    openBills: bills.filter((b) => b.paid_at === null),
    paidBills: bills.filter((b) => b.paid_at !== null),
  };
}

export function categoryName(payload: ExportPayload, categoryId: string | null): string {
  if (!categoryId) return 'Sem categoria';
  return payload.categoriesById.get(categoryId)?.name ?? 'Sem categoria';
}

/** Nome de arquivo previsível e ordenável: "fincouple-2026-09.xlsx". */
export function exportFileName(month: MonthKey, extension: 'xlsx' | 'pdf'): string {
  return `fincouple-${month}.${extension}`;
}
