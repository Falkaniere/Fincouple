import type { MonthKey } from '@/lib/month';
import { parseLooseAmountToCents } from './amount.ts';
import { parseLooseDate } from './date.ts';

export interface ImportedRow {
  id: string;
  occurredOn: string;
  description: string;
  /** Sempre positivo -- ver `credit`. */
  amountCents: number;
  /** Linha negativa no extrato (pagamento, estorno): não é uma compra, então
   *  chega desmarcada na revisão, mas a pessoa pode incluir se quiser. */
  credit: boolean;
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `import-${Date.now()}-${seq}`;
}

const DATE_HEADERS = ['data', 'date', 'dia'];
const DESCRIPTION_HEADERS = [
  'descri', 'estabelecimento', 'histórico', 'historico', 'lançamento', 'lancamento',
  'title', 'titulo',
];
const AMOUNT_HEADERS = ['valor', 'amount', 'r$'];

function findColumn(header: string[], candidates: string[]): number {
  const normalized = header.map((h) => h.toLowerCase());
  for (const candidate of candidates) {
    const index = normalized.findIndex((h) => h.includes(candidate));
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Recebe a matriz crua de uma planilha (csv ou xlsx) e devolve as linhas já
 * interpretadas. Primeiro tenta achar um cabeçalho pelos nomes comuns de
 * coluna; se não achar nenhum, assume que a primeira coluna é a data, a
 * última é o valor e o que sobrar no meio é a descrição -- o formato mais
 * comum de extrato exportado sem cabeçalho.
 */
export function rowsFromMatrix(matrix: unknown[][], referenceMonth: MonthKey): ImportedRow[] {
  const rows = matrix
    .map((row) => row.map((cell) => (cell == null ? '' : String(cell).trim())))
    .filter((row) => row.some((cell) => cell !== ''));

  if (rows.length === 0) return [];

  let dateCol = findColumn(rows[0], DATE_HEADERS);
  let descCol = findColumn(rows[0], DESCRIPTION_HEADERS);
  let amountCol = findColumn(rows[0], AMOUNT_HEADERS);

  let body = rows;
  if (dateCol !== -1 || descCol !== -1 || amountCol !== -1) {
    body = rows.slice(1);
  } else {
    dateCol = 0;
    amountCol = rows[0].length - 1;
    descCol = rows[0].length > 2 ? 1 : -1;
  }

  const result: ImportedRow[] = [];
  for (const row of body) {
    const dateRaw = dateCol !== -1 ? row[dateCol] : '';
    const amountRaw = amountCol !== -1 ? row[amountCol] : '';
    const occurredOn = parseLooseDate(dateRaw, referenceMonth);
    const amountCents = parseLooseAmountToCents(amountRaw);
    if (!occurredOn || amountCents === null || amountCents === 0) continue;

    const description =
      descCol !== -1
        ? row[descCol]
        : row
            .filter((_, i) => i !== dateCol && i !== amountCol)
            .join(' ')
            .trim();

    result.push({
      id: nextId(),
      occurredOn,
      description: description || 'Sem descrição',
      amountCents: Math.abs(amountCents),
      credit: amountCents < 0,
    });
  }

  return result;
}

// Data (dd/mm ou dd/mm/aaaa) + descrição + valor no fim da linha -- o formato
// que sobra depois de extrair o texto de uma fatura em PDF, já que o PDF não
// preserva colunas.
const LINE_PATTERN =
  /^(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+(.+?)\s+(-?(?:R\$\s?)?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}-?)$/;

export function rowsFromInvoiceText(text: string, referenceMonth: MonthKey): ImportedRow[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const result: ImportedRow[] = [];

  for (const line of lines) {
    const match = line.match(LINE_PATTERN);
    if (!match) continue;

    const [, dateRaw, descriptionRaw, amountRawToken] = match;
    const amountRaw = amountRawToken.endsWith('-')
      ? `-${amountRawToken.slice(0, -1)}`
      : amountRawToken;

    const occurredOn = parseLooseDate(dateRaw, referenceMonth);
    const amountCents = parseLooseAmountToCents(amountRaw);
    if (!occurredOn || amountCents === null || amountCents === 0) continue;

    result.push({
      id: nextId(),
      occurredOn,
      description: descriptionRaw.trim(),
      amountCents: Math.abs(amountCents),
      credit: amountCents < 0,
    });
  }

  return result;
}
