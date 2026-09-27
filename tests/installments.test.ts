import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addMonthsClamped,
  isValidInstallmentCount,
  splitInstallments,
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

test('parcelas somam exatamente o total, mesmo sem dividir exato', () => {
  const parts = splitInstallments(10000, 3, '2026-09-27');
  assert.equal(
    parts.reduce((sum, p) => sum + p.amountCents, 0),
    10000,
  );
  // 10000 / 3 = 3333,33...: a diferença vai para a primeira parcela.
  assert.deepEqual(
    parts.map((p) => p.amountCents),
    [3334, 3333, 3333],
  );
});

test('divisão exata não deixa sobra em nenhuma parcela', () => {
  const parts = splitInstallments(9000, 3, '2026-09-27');
  assert.deepEqual(
    parts.map((p) => p.amountCents),
    [3000, 3000, 3000],
  );
});

test('cada parcela cai um mês depois da anterior', () => {
  const parts = splitInstallments(30000, 3, '2026-01-31');
  assert.deepEqual(
    parts.map((p) => p.occurredOn),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  );
});

test('numeração e total ficam corretos em cada parcela', () => {
  const parts = splitInstallments(50000, 5, '2026-06-01');
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
  assert.throws(() => splitInstallments(1000, 1, '2026-09-27'));
  assert.throws(() => splitInstallments(1000, 25, '2026-09-27'));
  assert.throws(() => splitInstallments(1000, 0, '2026-09-27'));
});

test('rejeita valor total inválido', () => {
  assert.throws(() => splitInstallments(0, 3, '2026-09-27'));
  assert.throws(() => splitInstallments(-500, 3, '2026-09-27'));
  assert.throws(() => splitInstallments(10.5, 3, '2026-09-27'));
});

test('muitas parcelas (24x) ainda soma certo', () => {
  const parts = splitInstallments(100000, 24, '2026-01-15');
  assert.equal(
    parts.reduce((sum, p) => sum + p.amountCents, 0),
    100000,
  );
  assert.equal(parts.length, 24);
  // 23 meses depois de janeiro/2026 e' dezembro/2027.
  assert.equal(parts[23].occurredOn, '2027-12-15');
});
