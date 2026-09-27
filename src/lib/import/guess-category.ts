import type { Category } from '@/lib/types';

/**
 * Pistas de palavras comuns no nome do estabelecimento, associadas ao nome
 * de categoria mais provável. Servem só de ponto de partida -- a pessoa
 * confere e ajusta cada linha antes de importar.
 */
const HINTS: Array<{ pattern: RegExp; categoryName: string }> = [
  {
    pattern:
      /uber|99app|99pop|99táxi|99taxi|cabify|posto|combust[ií]vel|estacionamento|ped[aá]gio|metr[oô]|[oô]nibus/i,
    categoryName: 'transporte',
  },
  {
    pattern: /ifood|rappi|restaurante|lanchonete|pizzaria|padaria|burger|churrascaria|hamburgueria|\bbar\b/i,
    categoryName: 'restaurante',
  },
  {
    pattern:
      /mercado|supermercado|atacad[aã]o|hortifruti|carrefour|\bextra\b|p[aã]o de a[cç][uú]car|assai|sacol[aã]o/i,
    categoryName: 'mercado',
  },
  {
    pattern: /farm[aá]cia|drogaria|drogasil|pague menos|pacheco/i,
    categoryName: 'saúde',
  },
  {
    pattern: /netflix|spotify|amazon prime|disney|\bhbo\b|youtube premium|icloud|google (one|storage)|apple\.com/i,
    categoryName: 'assinaturas',
  },
  {
    pattern: /cinema|ingresso|steam|playstation|\bxbox\b|nintendo/i,
    categoryName: 'lazer',
  },
  {
    pattern: /aluguel|condom[ií]nio|imobili[aá]ria/i,
    categoryName: 'moradia',
  },
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Tenta achar, entre as categorias já cadastradas do casal, a que mais
 * combina com a descrição do lançamento importado. Primeiro procura o nome
 * da própria categoria dentro da descrição (cobre categorias que a pessoa já
 * renomeou); se não achar, cai nas pistas de palavras comuns de fatura.
 * Sem categoria correspondente, devolve null -- fica "Sem categoria" até a
 * pessoa escolher na revisão.
 */
export function guessCategoryId(description: string, categories: Category[]): string | null {
  const expenseCategories = categories.filter((c) => c.kind === 'expense');
  if (expenseCategories.length === 0) return null;

  const normalizedDescription = normalize(description);

  const byOwnName = expenseCategories.find((c) => {
    const name = normalize(c.name);
    return name.length >= 3 && normalizedDescription.includes(name);
  });
  if (byOwnName) return byOwnName.id;

  for (const hint of HINTS) {
    if (!hint.pattern.test(description)) continue;
    const match = expenseCategories.find((c) => normalize(c.name).includes(hint.categoryName));
    if (match) return match.id;
  }

  return null;
}
