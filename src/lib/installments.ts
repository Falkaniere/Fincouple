/**
 * Divide uma compra parcelada em N lançamentos, um por mês.
 *
 * Duas coisas exigem cuidado com dinheiro e datas:
 * - A soma das parcelas tem que bater exatamente com o total (nada de
 *   sobrar ou faltar um centavo por causa de arredondamento). A diferença
 *   fica na primeira parcela, como nas faturas de cartão.
 * - Comprar dia 31 e cair num mês sem dia 31 (fevereiro, por exemplo) não
 *   pode quebrar; a parcela cai no último dia daquele mês.
 */

export interface Installment {
  amountCents: number;
  occurredOn: string;
  installmentNo: number;
  installmentTotal: number;
}

const MIN_INSTALLMENTS = 2;
const MAX_INSTALLMENTS = 24;

export function isValidInstallmentCount(count: number): boolean {
  return Number.isInteger(count) && count >= MIN_INSTALLMENTS && count <= MAX_INSTALLMENTS;
}

function daysInMonth(year: number, month1to12: number): number {
  // Dia 0 do mês seguinte é o último dia do mês pedido.
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** "2026-01-31" + 1 mês -> "2026-02-28" (não existe 31 de fevereiro). */
export function addMonthsClamped(dateISO: string, months: number): string {
  const [year, month, day] = dateISO.split('-').map(Number);

  const zeroBased = month - 1 + months;
  const targetYear = year + Math.floor(zeroBased / 12);
  const targetMonth = ((zeroBased % 12) + 12) % 12; // 0-11

  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth + 1));

  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Divide `totalCents` em `count` parcelas mensais a partir de `firstOccurredOn`.
 * A diferença de arredondamento (quando totalCents não é múltiplo de count)
 * fica toda na primeira parcela.
 */
export function splitInstallments(
  totalCents: number,
  count: number,
  firstOccurredOn: string,
): Installment[] {
  if (!isValidInstallmentCount(count)) {
    throw new Error(`Número de parcelas inválido: ${count}`);
  }
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new Error(`Valor total inválido: ${totalCents}`);
  }

  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  return Array.from({ length: count }, (_, index) => ({
    amountCents: index === 0 ? base + remainder : base,
    occurredOn: addMonthsClamped(firstOccurredOn, index),
    installmentNo: index + 1,
    installmentTotal: count,
  }));
}
