/**
 * Extrato de cartão vem em formatos variados: "1.234,56" (padrão BR),
 * "45,90", às vezes "45.90" (planilha exportada em locale americano), e
 * negativos como "-45,90", "(45,90)" ou "45,90-" para pagamentos/estornos.
 * Nunca dividimos nem arredondamos -- só interpretamos os dígitos que já
 * estão lá, então nenhum centavo se perde na conversão.
 */
export function parseLooseAmountToCents(raw: unknown): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }

  s = s.replace(/[^\d,.-]/g, '');
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let integerPart: string;
  let decimalPart: string;

  if (hasComma && hasDot) {
    // O separador decimal é o que aparece por último na string.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
    [integerPart, decimalPart] = s.split('.');
  } else if (hasComma) {
    [integerPart, decimalPart] = s.split(',');
  } else if (hasDot) {
    const parts = s.split('.');
    const last = parts[parts.length - 1];
    if (parts.length > 1 && last.length === 2) {
      decimalPart = parts.pop()!;
      integerPart = parts.join('');
    } else {
      integerPart = parts.join('');
      decimalPart = '00';
    }
  } else {
    integerPart = s;
    decimalPart = '00';
  }

  integerPart = integerPart || '0';
  decimalPart = (decimalPart || '00').padEnd(2, '0').slice(0, 2);
  if (!/^\d+$/.test(integerPart) || !/^\d+$/.test(decimalPart)) return null;

  const cents = Number(integerPart) * 100 + Number(decimalPart);
  return negative ? -cents : cents;
}
