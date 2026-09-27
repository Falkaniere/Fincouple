/**
 * Dinheiro é sempre tratado em centavos inteiros. Converter para float só na
 * hora de mostrar evita que 0.1 + 0.2 apareça no saldo do casal.
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const BRL_NO_SYMBOL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 25990 -> "R$ 259,90" */
export function formatCents(cents: number): string {
  return BRL.format(cents / 100);
}

/** 25990 -> "259,90" (para dentro de inputs) */
export function formatCentsPlain(cents: number): string {
  return BRL_NO_SYMBOL.format(cents / 100);
}

/**
 * Valor compacto para caber em telas estreitas: 1234567 -> "R$ 12,3 mil".
 * Abaixo de mil reais mostra o valor cheio, que é o caso comum.
 */
export function formatCentsCompact(cents: number): string {
  const reais = cents / 100;
  if (Math.abs(reais) < 1000) return BRL.format(reais);
  if (Math.abs(reais) < 1_000_000) {
    return `R$ ${BRL_NO_SYMBOL.format(reais / 1000).replace(/,00$/, '')} mil`;
  }
  return `R$ ${BRL_NO_SYMBOL.format(reais / 1_000_000)} mi`;
}

/**
 * Máscara de digitação: mantém só os dígitos e trata o número como centavos,
 * então digitar "2599" mostra "25,99". É como funcionam os apps de banco e
 * dispensa o usuário de acertar a vírgula.
 */
export function maskAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const cents = padded.slice(-2);
  const units = padded.slice(0, -2);
  return `${units.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
}

/** Lê o valor digitado (mascarado ou não) de volta para centavos. */
export function parseAmountToCents(masked: string): number {
  const digits = masked.replace(/\D/g, '');
  if (!digits) return 0;
  // Number é seguro aqui: centavos inteiros só passam de 2^53 acima de
  // 90 trilhões de reais.
  return Number(digits);
}
