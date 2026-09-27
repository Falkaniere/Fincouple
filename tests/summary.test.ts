import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summarizeMonth } from '../src/lib/summary.ts';
import type { Category, Transaction } from '../src/lib/types.ts';

function cat(id: string, name: string, color = '#000000'): Category {
  return {
    id,
    couple_id: 'c1',
    name,
    kind: 'expense',
    color,
    created_at: '2026-09-01T00:00:00Z',
  };
}

let seq = 0;
function tx(partial: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    couple_id: 'c1',
    category_id: null,
    kind: 'expense',
    amount_cents: 1000,
    occurred_on: '2026-09-10',
    description: null,
    created_by: 'u1',
    created_at: '2026-09-10T12:00:00Z',
    installment_group: null,
    installment_no: null,
    installment_total: null,
    ...partial,
  };
}

test('mês sem lançamento nenhum', () => {
  const s = summarizeMonth([], []);
  assert.deepEqual(s, { incomeCents: 0, expenseCents: 0, balanceCents: 0, ranking: [] });
});

test('saldo é receitas menos despesas', () => {
  const s = summarizeMonth(
    [
      tx({ kind: 'income', amount_cents: 800000 }),
      tx({ kind: 'expense', amount_cents: 25990 }),
      tx({ kind: 'expense', amount_cents: 7500 }),
    ],
    [],
  );
  assert.equal(s.incomeCents, 800000);
  assert.equal(s.expenseCents, 33490);
  assert.equal(s.balanceCents, 766510);
});

test('saldo negativo quando se gasta mais do que entra', () => {
  const s = summarizeMonth(
    [tx({ kind: 'income', amount_cents: 1000 }), tx({ kind: 'expense', amount_cents: 2500 })],
    [],
  );
  assert.equal(s.balanceCents, -1500);
});

test('receita não entra no ranking de gastos', () => {
  const mercado = cat('cat1', 'Mercado');
  const s = summarizeMonth(
    [
      tx({ kind: 'income', amount_cents: 500000, category_id: 'cat1' }),
      tx({ kind: 'expense', amount_cents: 3000, category_id: 'cat1' }),
    ],
    [mercado],
  );
  assert.equal(s.ranking.length, 1);
  assert.equal(s.ranking[0].cents, 3000);
});

test('ranking soma por categoria e ordena do maior para o menor', () => {
  const categories = [cat('a', 'Mercado'), cat('b', 'Lazer'), cat('c', 'Transporte')];
  const s = summarizeMonth(
    [
      tx({ category_id: 'b', amount_cents: 5000 }),
      tx({ category_id: 'a', amount_cents: 10000 }),
      tx({ category_id: 'a', amount_cents: 20000 }),
      tx({ category_id: 'c', amount_cents: 7000 }),
    ],
    categories,
  );

  assert.deepEqual(
    s.ranking.map((r) => [r.name, r.cents]),
    [
      ['Mercado', 30000],
      ['Transporte', 7000],
      ['Lazer', 5000],
    ],
  );
});

test('a fração de cada categoria soma 1', () => {
  const s = summarizeMonth(
    [
      tx({ category_id: 'a', amount_cents: 7500 }),
      tx({ category_id: 'b', amount_cents: 2500 }),
    ],
    [cat('a', 'Mercado'), cat('b', 'Lazer')],
  );
  assert.equal(s.ranking[0].share, 0.75);
  assert.equal(s.ranking[1].share, 0.25);
  assert.equal(
    s.ranking.reduce((acc, r) => acc + r.share, 0),
    1,
  );
});

test('lançamento sem categoria aparece como "Sem categoria"', () => {
  const s = summarizeMonth([tx({ category_id: null, amount_cents: 4200 })], []);
  assert.equal(s.ranking[0].name, 'Sem categoria');
  assert.equal(s.ranking[0].categoryId, null);
});

test('categoria apagada depois do lançamento não quebra o ranking', () => {
  // O banco põe category_id = null no delete, mas se um id órfão chegar,
  // o ranking ainda tem que funcionar.
  const s = summarizeMonth([tx({ category_id: 'sumiu', amount_cents: 900 })], []);
  assert.equal(s.ranking.length, 1);
  assert.equal(s.ranking[0].name, 'Sem categoria');
  assert.equal(s.ranking[0].cents, 900);
});

test('empate no valor é desfeito pelo nome, então a ordem não dança', () => {
  const categories = [cat('a', 'Zumba'), cat('b', 'Água'), cat('c', 'Mercado')];
  const txs = [
    tx({ category_id: 'a', amount_cents: 1000 }),
    tx({ category_id: 'b', amount_cents: 1000 }),
    tx({ category_id: 'c', amount_cents: 1000 }),
  ];
  const first = summarizeMonth(txs, categories).ranking.map((r) => r.name);
  // Mesma entrada em outra ordem tem que dar a mesma saída.
  const second = summarizeMonth([...txs].reverse(), categories).ranking.map((r) => r.name);
  assert.deepEqual(first, second);
  // "Água" antes de "Mercado" e "Zumba": ordenação com acento do pt-BR.
  assert.deepEqual(first, ['Água', 'Mercado', 'Zumba']);
});

test('só receita: ranking vazio e nenhuma divisão por zero', () => {
  const s = summarizeMonth([tx({ kind: 'income', amount_cents: 300000 })], []);
  assert.equal(s.expenseCents, 0);
  assert.deepEqual(s.ranking, []);
});

test('valores grandes continuam exatos em centavos', () => {
  const s = summarizeMonth(
    [
      tx({ kind: 'expense', amount_cents: 999_999_99 }),
      tx({ kind: 'expense', amount_cents: 1 }),
    ],
    [],
  );
  assert.equal(s.expenseCents, 100_000_000);
});

// ------------------------------------------------------------- exportações

test('descrição da parcela inclui "(no/total)" para exportações', async () => {
  const { descriptionWithInstallment } = await import('../src/lib/transaction-description.ts');

  const avulso = tx({ description: 'Padaria' });
  assert.equal(descriptionWithInstallment(avulso), 'Padaria');

  const parcela = tx({
    description: 'Geladeira',
    installment_group: 'g1',
    installment_no: 2,
    installment_total: 3,
  });
  assert.equal(descriptionWithInstallment(parcela), 'Geladeira (2/3)');

  const parcelaSemDescricao = tx({
    description: null,
    installment_group: 'g1',
    installment_no: 1,
    installment_total: 3,
  });
  assert.equal(descriptionWithInstallment(parcelaSemDescricao), '(1/3)');
});
