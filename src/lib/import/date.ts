import type { MonthKey } from '@/lib/month';

/**
 * Interpreta datas nos formatos comuns de extrato: ISO ("2026-09-27"), BR
 * ("27/09/2026", "27-09-26") e só dia/mês ("27/09"), que é como boa parte
 * das faturas mostra cada lançamento -- nesse caso usa o ano do mês de
 * referência (o mês que está sendo importado).
 */
export function parseLooseDate(raw: unknown, referenceMonth: MonthKey): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return isoFrom(Number(m[1]), Number(m[2]), Number(m[3]));

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return isoFrom(year, Number(m[2]), Number(m[1]));
  }

  m = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const [refYear] = referenceMonth.split('-').map(Number);
    return isoFrom(refYear, Number(m[2]), Number(m[1]));
  }

  return null;
}

function isoFrom(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
