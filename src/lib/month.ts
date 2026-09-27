/**
 * O mês do controle é o mês civil no fuso do casal (America/Sao_Paulo).
 * Tudo aqui trabalha com "YYYY-MM" e "YYYY-MM-DD" em texto, nunca com
 * `new Date(string)`, para o dia não escorregar por causa de UTC.
 */

export const TIME_ZONE = 'America/Sao_Paulo';

/** Chave de mês, ex. "2026-09". */
export type MonthKey = string;

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Data de hoje no fuso do casal, como "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  // en-CA formata como YYYY-MM-DD, que é exatamente o formato do Postgres.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Mês corrente no fuso do casal, como "YYYY-MM". */
export function currentMonthKey(now: Date = new Date()): MonthKey {
  return todayISO(now).slice(0, 7);
}

/** Primeiro dia do mês, inclusivo: "2026-09" -> "2026-09-01". */
export function monthStart(month: MonthKey): string {
  return `${month}-01`;
}

/**
 * Primeiro dia do mês seguinte, exclusivo. Usar `< nextMonthStart` em vez de
 * `<= lastDay` evita errar fevereiro e meses de 30 dias.
 */
export function nextMonthStart(month: MonthKey): string {
  return monthStart(shiftMonth(month, 1));
}

/** Anda `delta` meses: shiftMonth("2026-01", -1) -> "2025-12". */
export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [year, m] = month.split('-').map(Number);
  const zeroBased = m - 1 + delta;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12;
  return `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
}

/** "2026-09" -> "setembro de 2026" */
export function formatMonthLong(month: MonthKey): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${year}`;
}

/** "2026-09" -> "Setembro 2026" */
export function formatMonthShort(month: MonthKey): string {
  const [year, m] = month.split('-').map(Number);
  const name = MONTH_NAMES[m - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

/** "2026-09-27" -> "27/09" */
export function formatDayShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** "2026-09-27" -> "27/09/2026" */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Dias até o vencimento (negativo = atrasada). */
export function daysUntil(iso: string, today: string = todayISO()): number {
  const toUTC = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(iso) - toUTC(today)) / 86_400_000);
}
