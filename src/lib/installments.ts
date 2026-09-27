/**
 * Gera as N parcelas de uma compra parcelada, uma por mês.
 *
 * De propósito NÃO existe divisão de valor aqui. A pessoa diz quanto é
 * *cada* parcela (é o número que aparece na fatura todo mês); as N linhas
 * saem com exatamente esse valor, sem exceção. Dividir um total em N partes
 * sempre obriga a decidir onde colocar o centavo que sobra — e por ser
 * dinheiro, cada centavo importa, então essa decisão não é nossa para tomar.
 *
 * A única conta que resta é multiplicação (valor × N para mostrar o total),
 * que nunca perde nem inventa centavo.
 *
 * Datas exigem cuidado: comprar dia 31 e cair num mês sem dia 31 (fevereiro,
 * por exemplo) não pode quebrar; a parcela cai no último dia daquele mês.
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
 * Monta as `count` parcelas de `amountCentsPerInstallment` cada, a partir de
 * `firstOccurredOn`. Todas as parcelas valem exatamente o mesmo — nenhuma
 * fica maior nem menor que as outras.
 */
export function buildInstallments(
  amountCentsPerInstallment: number,
  count: number,
  firstOccurredOn: string,
): Installment[] {
  if (!isValidInstallmentCount(count)) {
    throw new Error(`Número de parcelas inválido: ${count}`);
  }
  if (!Number.isInteger(amountCentsPerInstallment) || amountCentsPerInstallment <= 0) {
    throw new Error(`Valor da parcela inválido: ${amountCentsPerInstallment}`);
  }

  return Array.from({ length: count }, (_, index) => ({
    amountCents: amountCentsPerInstallment,
    occurredOn: addMonthsClamped(firstOccurredOn, index),
    installmentNo: index + 1,
    installmentTotal: count,
  }));
}

/** Total da compra: só multiplicação, nunca perde ou inventa centavo. */
export function totalOfInstallments(amountCentsPerInstallment: number, count: number): number {
  return amountCentsPerInstallment * count;
}
