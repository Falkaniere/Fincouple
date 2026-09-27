import type { Transaction } from './types';

/** Descrição do lançamento, com "(2/3)" no final quando é uma parcela. */
export function descriptionWithInstallment(t: Transaction): string {
  const base = t.description ?? '';
  if (!t.installment_total) return base;
  return `${base ? `${base} ` : ''}(${t.installment_no}/${t.installment_total})`;
}
