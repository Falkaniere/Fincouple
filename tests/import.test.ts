import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseLooseAmountToCents } from '../src/lib/import/amount.ts';
import { parseLooseDate } from '../src/lib/import/date.ts';
import { guessCategoryId } from '../src/lib/import/guess-category.ts';
import { rowsFromInvoiceText, rowsFromMatrix } from '../src/lib/import/rows.ts';
import type { Category } from '../src/lib/types.ts';

// ------------------------------------------------------------------ dinheiro

test('valor solto: "45,90" -> 4590 centavos', () => {
  assert.equal(parseLooseAmountToCents('45,90'), 4590);
});

test('valor com milhar: "1.234,56" -> 123456 centavos', () => {
  assert.equal(parseLooseAmountToCents('1.234,56'), 123456);
});

test('valor com símbolo e espaço: "R$ 1.234,56" -> 123456 centavos', () => {
  assert.equal(parseLooseAmountToCents('R$ 1.234,56'), 123456);
});

test('valor em formato americano: "45.90" -> 4590 centavos', () => {
  assert.equal(parseLooseAmountToCents('45.90'), 4590);
});

test('valor negativo com sinal: "-45,90" -> -4590', () => {
  assert.equal(parseLooseAmountToCents('-45,90'), -4590);
});

test('valor negativo entre parênteses: "(45,90)" -> -4590', () => {
  assert.equal(parseLooseAmountToCents('(45,90)'), -4590);
});

test('valor negativo com hífen no fim: "45,90-" -> -4590', () => {
  assert.equal(parseLooseAmountToCents('45,90-'), -4590);
});

test('valor inteiro sem decimal: "45" -> 4500', () => {
  assert.equal(parseLooseAmountToCents('45'), 4500);
});

test('valor vazio ou inválido devolve null', () => {
  assert.equal(parseLooseAmountToCents(''), null);
  assert.equal(parseLooseAmountToCents('   '), null);
  assert.equal(parseLooseAmountToCents(null), null);
});

test('nunca perde centavo em valores grandes: "12.345.678,99"', () => {
  assert.equal(parseLooseAmountToCents('12.345.678,99'), 1_234_567_899);
});

// ------------------------------------------------------------------- datas

test('data ISO: "2026-09-27"', () => {
  assert.equal(parseLooseDate('2026-09-27', '2026-09'), '2026-09-27');
});

test('data BR com ano completo: "27/09/2026"', () => {
  assert.equal(parseLooseDate('27/09/2026', '2026-09'), '2026-09-27');
});

test('data BR com ano de 2 dígitos: "27/09/26"', () => {
  assert.equal(parseLooseDate('27/09/26', '2026-09'), '2026-09-27');
});

test('só dia/mês usa o ano do mês de referência: "27/09"', () => {
  assert.equal(parseLooseDate('27/09', '2026-09'), '2026-09-27');
  assert.equal(parseLooseDate('27/09', '2025-01'), '2025-09-27');
});

test('data inválida devolve null', () => {
  assert.equal(parseLooseDate('não é data', '2026-09'), null);
  assert.equal(parseLooseDate('', '2026-09'), null);
  assert.equal(parseLooseDate('32/13/2026', '2026-09'), null);
});

// ------------------------------------------------------------------ linhas

test('matriz com cabeçalho reconhecido extrai data, descrição e valor', () => {
  const rows = rowsFromMatrix(
    [
      ['Data', 'Estabelecimento', 'Valor'],
      ['27/09/2026', 'UBER *TRIP', '32,50'],
      ['28/09/2026', 'IFOOD', '58,90'],
    ],
    '2026-09',
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => [r.occurredOn, r.description, r.amountCents, r.credit]),
    [
      ['2026-09-27', 'UBER *TRIP', 3250, false],
      ['2026-09-28', 'IFOOD', 5890, false],
    ],
  );
});

test('matriz sem cabeçalho assume data na primeira coluna e valor na última', () => {
  const rows = rowsFromMatrix(
    [
      ['27/09', 'Padaria do Zé', '12,00'],
      ['28/09', 'Farmácia', '45,00'],
    ],
    '2026-09',
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].description, 'Padaria do Zé');
  assert.equal(rows[0].amountCents, 1200);
});

test('linha de pagamento (valor negativo) fica marcada como credit', () => {
  const rows = rowsFromMatrix(
    [
      ['Data', 'Descrição', 'Valor'],
      ['05/09/2026', 'PAGAMENTO RECEBIDO', '-1.200,00'],
    ],
    '2026-09',
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].credit, true);
  assert.equal(rows[0].amountCents, 120000);
});

test('linhas sem data ou valor válido são ignoradas, o resto continua', () => {
  const rows = rowsFromMatrix(
    [
      ['Data', 'Descrição', 'Valor'],
      ['linha quebrada', 'sem data válida', 'abc'],
      ['27/09/2026', 'Compra válida', '10,00'],
    ],
    '2026-09',
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].description, 'Compra válida');
});

test('linha com valor zero é ignorada', () => {
  const rows = rowsFromMatrix([['27/09/2026', 'Estorno total', '0,00']], '2026-09');
  assert.equal(rows.length, 0);
});

test('texto de fatura em PDF: extrai linhas "data descrição valor"', () => {
  const text = [
    'Fatura de setembro',
    '27/09 UBER *TRIP 45,90',
    '28/09 IFOOD *RESTAURANTE 89,00',
    'Total da fatura R$ 1.234,56',
  ].join('\n');

  const rows = rowsFromInvoiceText(text, '2026-09');

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => [r.occurredOn, r.description, r.amountCents]),
    [
      ['2026-09-27', 'UBER *TRIP', 4590],
      ['2026-09-28', 'IFOOD *RESTAURANTE', 8900],
    ],
  );
});

test('linha de pagamento no PDF (com hífen no fim) fica marcada como credit', () => {
  const rows = rowsFromInvoiceText('25/09 PAGAMENTO EM 25/09 1.200,00-', '2026-09');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].credit, true);
});

// -------------------------------------------------------------- categorias

function cat(id: string, name: string): Category {
  return { id, couple_id: 'c1', name, kind: 'expense', color: '#000', created_at: '2026-01-01' };
}

test('categoria sugerida por palavra-chave comum de fatura', () => {
  const categories = [cat('t', 'Transporte'), cat('r', 'Restaurante'), cat('m', 'Mercado')];

  assert.equal(guessCategoryId('UBER *TRIP', categories), 't');
  assert.equal(guessCategoryId('IFOOD *RESTAURANTE XPTO', categories), 'r');
  assert.equal(guessCategoryId('CARREFOUR SUPERMERCADO', categories), 'm');
});

test('categoria sugerida quando o próprio nome da categoria aparece na descrição', () => {
  const categories = [cat('a', 'Academia'), cat('p', 'Pet')];
  assert.equal(guessCategoryId('MENSALIDADE ACADEMIA SMART FIT', categories), 'a');
  assert.equal(guessCategoryId('PETSHOP AMIGO FIEL', categories), 'p');
});

test('sem pista nenhuma, devolve null (fica "Sem categoria")', () => {
  const categories = [cat('t', 'Transporte')];
  assert.equal(guessCategoryId('COMPRA DESCONHECIDA XYZ', categories), null);
});

test('sem categorias de despesa cadastradas, devolve null', () => {
  assert.equal(guessCategoryId('UBER *TRIP', []), null);
});
