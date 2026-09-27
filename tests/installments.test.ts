import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addMonthsClamped,
  buildInstallments,
  isValidInstallmentCount,
  totalOfInstallments,
} from '../src/lib/installments.ts';

test('validação do número de parcelas', () => {
  assert.equal(isValidInstallmentCount(1), false); // 1x não é parcelado
  assert.equal(isValidInstallmentCount(2), true);
  assert.equal(isValidInstallmentCount(24), true);
  assert.equal(isValidInstallmentCount(25), false);
  assert.equal(isValidInstallmentCount(0), false);
  assert.equal(isValidInstallmentCount(-3), false);
  assert.equal(isValidInstallmentCount(2.5), false);
});

test('andar meses trata o fim do mês (dia 31 -> fevereiro)', () => {
  assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsClamped('2024-01-31', 1), '2024-02-29'); // bissexto
  assert.equal(addMonthsClamped('2026-01-31', 2), '2026-03-31');
  assert.equal(addMonthsClamped('2026-05-31', 1), '2026-06-30');
});

test('andar meses atravessa o ano', () => {
  assert.equal(addMonthsClamped('2026-12-15', 1), '2027-01-15');
  assert.equal(addMonthsClamped('2026-11-01', 3), '2027-02-01');
});

test('todas as parcelas valem exatamente o mesmo -- nunca há divisão', () => {
  // 10000 centavos não divide por 3 sem sobra; mesmo assim NENHUMA parcela
  // difere das outras, porque não existe divisão aqui.
  const parts = buildInstallments(10000, 3, '2026-09-27');
  assert.deepEqual(
    parts.map((p) => p.amountCents),
    [10000, 10000, 10000],
  );
});

test('o total é só a multiplicação, sem perder nem inventar centavo', () => {
  assert.equal(totalOfInstallments(3333, 3), 9999);
  assert.equal(totalOfInstallments(10000, 8), 80000);
  assert.equal(totalOfInstallments(1, 24), 24);
});

test('cada parcela cai um mês depois da anterior', () => {
  const parts = buildInstallments(10000, 3, '2026-01-31');
  assert.deepEqual(
    parts.map((p) => p.occurredOn),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  );
});

test('numeração e total ficam corretos em cada parcela', () => {
  const parts = buildInstallments(50000, 5, '2026-06-01');
  assert.deepEqual(
    parts.map((p) => [p.installmentNo, p.installmentTotal]),
    [
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
    ],
  );
});

test('rejeita quantidade de parcelas inválida', () => {
  assert.throws(() => buildInstallments(1000, 1, '2026-09-27'));
  assert.throws(() => buildInstallments(1000, 25, '2026-09-27'));
  assert.throws(() => buildInstallments(1000, 0, '2026-09-27'));
});

test('rejeita valor de parcela inválido', () => {
  assert.throws(() => buildInstallments(0, 3, '2026-09-27'));
  assert.throws(() => buildInstallments(-500, 3, '2026-09-27'));
  assert.throws(() => buildInstallments(10.5, 3, '2026-09-27'));
});

test('muitas parcelas (24x) mantêm o mesmo valor em todas', () => {
  const parts = buildInstallments(4999, 24, '2026-01-15');
  assert.equal(parts.length, 24);
  assert.ok(parts.every((p) => p.amountCents === 4999));
  // 23 meses depois de janeiro/2026 e' dezembro/2027.
  assert.equal(parts[23].occurredOn, '2027-12-15');
  assert.equal(totalOfInstallments(4999, 24), 119976);
});
