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

export function isValidStartingInstallment(startAt: number, total: number): boolean {
  return Number.isInteger(startAt) && startAt >= 1 && startAt <= total;
}

/**
 * Monta as parcelas de `amountCentsPerInstallment` cada, do número `startAt`
 * até `total` (por padrão, desde a 1ª), a partir de `firstOccurredOn`. Todas
 * valem exatamente o mesmo -- nenhuma fica maior nem menor que as outras.
 *
 * `startAt` serve para lançar uma compra que já vinha sendo paga antes de
 * usar o app: dizendo que já é a 8ª de 12, ele só cria as parcelas que faltam
 * (8 a 12), com a numeração certa desde a primeira.
 */
export function buildInstallments(
  amountCentsPerInstallment: number,
  total: number,
  firstOccurredOn: string,
  startAt: number = 1,
): Installment[] {
  if (!isValidInstallmentCount(total)) {
    throw new Error(`Número de parcelas inválido: ${total}`);
  }
  if (!isValidStartingInstallment(startAt, total)) {
    throw new Error(`Parcela inicial inválida: ${startAt} de ${total}`);
  }
  if (!Number.isInteger(amountCentsPerInstallment) || amountCentsPerInstallment <= 0) {
    throw new Error(`Valor da parcela inválido: ${amountCentsPerInstallment}`);
  }

  const remaining = total - startAt + 1;
  return Array.from({ length: remaining }, (_, index) => ({
    amountCents: amountCentsPerInstallment,
    occurredOn: addMonthsClamped(firstOccurredOn, index),
    installmentNo: startAt + index,
    installmentTotal: total,
  }));
}

/** Total da compra: só multiplicação, nunca perde ou inventa centavo. */
export function totalOfInstallments(amountCentsPerInstallment: number, count: number): number {
  return amountCentsPerInstallment * count;
}
