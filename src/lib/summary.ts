import type { Category, CategoryTotal, Transaction } from './types';

const UNCATEGORIZED_COLOR = '#94a3b8';
const UNCATEGORIZED_LABEL = 'Sem categoria';

export interface MonthSummary {
  incomeCents: number;
  expenseCents: number;
  /** Receitas menos despesas. Pode ser negativo. */
  balanceCents: number;
  /** Ranking de despesas por categoria, do maior para o menor. */
  ranking: CategoryTotal[];
}

/**
 * Agrega os lançamentos de um mês: totais, saldo e ranking de categorias.
 * Função pura, sem React — é usada pela tela inicial e pelas exportações.
 */
export function summarizeMonth(
  transactions: Transaction[],
  categories: Category[],
): MonthSummary {
  const byId = new Map(categories.map((c) => [c.id, c]));

  let incomeCents = 0;
  let expenseCents = 0;
  const totals = new Map<string, { name: string; color: string; cents: number }>();

  for (const t of transactions) {
    if (t.kind === 'income') {
      incomeCents += t.amount_cents;
      continue;
    }

    expenseCents += t.amount_cents;

    // A categoria pode ter sido apagada depois do lançamento (o banco põe null).
    const key = t.category_id ?? '__none__';
    const category = t.category_id ? byId.get(t.category_id) : undefined;
    const current = totals.get(key);

    if (current) {
      current.cents += t.amount_cents;
    } else {
      totals.set(key, {
        name: category?.name ?? UNCATEGORIZED_LABEL,
        color: category?.color ?? UNCATEGORIZED_COLOR,
        cents: t.amount_cents,
      });
    }
  }

  const ranking: CategoryTotal[] = [...totals.entries()]
    .map(([key, value]) => ({
      categoryId: key === '__none__' ? null : key,
      name: value.name,
      color: value.color,
      cents: value.cents,
      share: expenseCents > 0 ? value.cents / expenseCents : 0,
    }))
    // Maior gasto primeiro; empate resolvido pelo nome para a ordem não dançar
    // entre renders.
    .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, 'pt-BR'));

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    ranking,
  };
}

/** Fração do limite mensal já gasta (pode passar de 1). */
export function limitProgress(expenseCents: number, limitCents: number): number {
  if (limitCents <= 0) return 0;
  return expenseCents / limitCents;
}
