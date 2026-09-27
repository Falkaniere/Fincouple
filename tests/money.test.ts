import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatCents,
  formatCentsCompact,
  maskAmountInput,
  parseAmountToCents,
} from '../src/lib/money.ts';

// Espaço não separável é o que o Intl do pt-BR usa entre "R$" e o número.
const norm = (s: string) => s.replace(/ /g, ' ');

test('formata centavos em reais', () => {
  assert.equal(norm(formatCents(0)), 'R$ 0,00');
  assert.equal(norm(formatCents(5)), 'R$ 0,05');
  assert.equal(norm(formatCents(25990)), 'R$ 259,90');
  assert.equal(norm(formatCents(100000)), 'R$ 1.000,00');
  assert.equal(norm(formatCents(-4500)), '-R$ 45,00');
});

test('valor compacto encurta só quando passa de mil reais', () => {
  assert.equal(norm(formatCentsCompact(99999)), 'R$ 999,99');
  assert.equal(norm(formatCentsCompact(123456789)), 'R$ 1,23 mi');
  assert.match(norm(formatCentsCompact(1234500)), /mil$/);
});

test('máscara trata os dígitos como centavos', () => {
  assert.equal(maskAmountInput(''), '');
  assert.equal(maskAmountInput('5'), '0,05');
  assert.equal(maskAmountInput('50'), '0,50');
  assert.equal(maskAmountInput('599'), '5,99');
  assert.equal(maskAmountInput('2599'), '25,99');
  assert.equal(maskAmountInput('125990'), '1.259,90');
  assert.equal(maskAmountInput('123456789'), '1.234.567,89');
});

test('máscara ignora o que não é dígito e zeros à esquerda', () => {
  assert.equal(maskAmountInput('R$ 25,99'), '25,99');
  assert.equal(maskAmountInput('abc2599xyz'), '25,99');
  assert.equal(maskAmountInput('0002599'), '25,99');
});

test('a máscara é estável: remascarar não muda o valor', () => {
  for (const raw of ['5', '599', '2599', '125990', '123456789']) {
    const once = maskAmountInput(raw);
    assert.equal(maskAmountInput(once), once, `instável para ${raw}`);
  }
});

test('ida e volta entre máscara e centavos preserva o valor', () => {
  for (const cents of [1, 5, 99, 100, 25990, 1259900, 123456789]) {
    assert.equal(parseAmountToCents(maskAmountInput(String(cents))), cents);
  }
});

test('parse aceita valor digitado à mão', () => {
  assert.equal(parseAmountToCents(''), 0);
  assert.equal(parseAmountToCents('R$ 1.259,90'), 125990);
  assert.equal(parseAmountToCents('25,99'), 2599);
});

test('somar centavos não gera erro de ponto flutuante', () => {
  // O motivo de guardarmos centavos: 0.1 + 0.2 !== 0.3 em float.
  const total = [10, 20].reduce((a, b) => a + b, 0);
  assert.equal(total, 30);
  assert.equal(norm(formatCents(total)), 'R$ 0,30');
});
