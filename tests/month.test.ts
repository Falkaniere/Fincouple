import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  currentMonthKey,
  daysUntil,
  formatDateBR,
  formatDayShort,
  formatMonthLong,
  formatMonthShort,
  monthStart,
  nextMonthStart,
  shiftMonth,
  todayISO,
} from '../src/lib/month.ts';

test('hoje é calculado no fuso de São Paulo', () => {
  // 03:00 UTC de 28/09 ainda é 27/09 no Brasil (UTC-3).
  assert.equal(todayISO(new Date('2026-09-28T02:30:00Z')), '2026-09-27');
  // 04:00 UTC já virou o dia.
  assert.equal(todayISO(new Date('2026-09-28T04:00:00Z')), '2026-09-28');
});

test('o mês corrente vem do fuso do casal', () => {
  // Meia-noite e meia UTC de 1º de outubro ainda é setembro aqui.
  assert.equal(currentMonthKey(new Date('2026-10-01T00:30:00Z')), '2026-09');
  assert.equal(currentMonthKey(new Date('2026-10-01T03:30:00Z')), '2026-10');
});

test('intervalo do mês é meio aberto, o que acerta fevereiro', () => {
  assert.equal(monthStart('2026-02'), '2026-02-01');
  assert.equal(nextMonthStart('2026-02'), '2026-03-01');
  // Ano bissexto: 29 de fevereiro cai dentro do intervalo.
  assert.ok('2024-02-29' >= monthStart('2024-02'));
  assert.ok('2024-02-29' < nextMonthStart('2024-02'));
  // E 1º de março não.
  assert.ok(!('2024-03-01' < nextMonthStart('2024-02')));
});

test('andar de mês atravessa o ano', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2025-12', 1), '2026-01');
  assert.equal(shiftMonth('2026-09', 4), '2027-01');
  assert.equal(shiftMonth('2026-09', -21), '2024-12');
  assert.equal(shiftMonth('2026-06', 0), '2026-06');
});

test('andar e voltar volta ao mesmo mês', () => {
  for (const delta of [1, 5, 13, 24, -7, -18]) {
    assert.equal(shiftMonth(shiftMonth('2026-09', delta), -delta), '2026-09');
  }
});

test('nomes de mês em português', () => {
  assert.equal(formatMonthLong('2026-03'), 'março de 2026');
  assert.equal(formatMonthShort('2026-03'), 'Março 2026');
  assert.equal(formatMonthShort('2026-12'), 'Dezembro 2026');
});

test('datas no formato brasileiro', () => {
  assert.equal(formatDayShort('2026-09-27'), '27/09');
  assert.equal(formatDateBR('2026-09-27'), '27/09/2026');
});

test('dias até o vencimento, incluindo atraso', () => {
  assert.equal(daysUntil('2026-09-30', '2026-09-27'), 3);
  assert.equal(daysUntil('2026-09-27', '2026-09-27'), 0);
  assert.equal(daysUntil('2026-09-25', '2026-09-27'), -2);
  // Atravessando o mês e o ano.
  assert.equal(daysUntil('2026-10-01', '2026-09-30'), 1);
  assert.equal(daysUntil('2027-01-01', '2026-12-31'), 1);
  // Horário de verão não deve criar um dia de 23h: usamos UTC na conta.
  assert.equal(daysUntil('2026-11-01', '2026-10-01'), 31);
});
