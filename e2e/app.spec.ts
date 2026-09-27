import { expect, test, type Page } from '@playwright/test';

const FAKE = 'http://127.0.0.1:54321';

/**
 * Percorre o app real num navegador real. O backend é o Supabase falso
 * (e2e/fake-supabase-server.mjs); a segurança de verdade (RLS) é testada
 * direto no Postgres, em supabase/test/.
 */

test.beforeEach(async ({ request }) => {
  // Cada teste parte de um banco vazio.
  await request.post(`${FAKE}/__state`);
});

/** Faz o login por link mágico e cria o casal. */
async function signInAndCreateCouple(page: Page, limit = '400000') {
  await page.goto('/login');
  await page.getByLabel('Seu email').fill('jonatas@example.com');
  await page.getByRole('button', { name: 'Receber link de acesso' }).click();
  await expect(page.getByText('Olhe seu email')).toBeVisible();

  // O clique no link do email chega como o callback abaixo.
  await page.goto('/auth/callback?code=codigo-de-teste');

  await expect(page.getByRole('heading', { name: 'Vamos começar' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar nosso controle' }).click();

  await page.getByLabel('Nome do controle').fill('Nossa casa');
  await page.getByLabel('Limite de gastos por mês').fill(limit);
  await page.getByRole('button', { name: 'Criar', exact: true }).click();

  await expect(page.getByText('Prontinho!')).toBeVisible();
  await page.getByRole('button', { name: 'Ir para o controle' }).click();
  await expect(page.getByLabel('Saldo do mês')).toBeVisible();
}

test('login, criação do casal e código de convite', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('link', { name: 'Ajustes' }).click();
  // O código precisa estar visível: perdê-lo é perder o acesso do parceiro.
  await expect(page.getByText('ABC234')).toBeVisible();
  await expect(page.getByText('Mande o código acima')).toBeVisible();
});

test('lança uma despesa e ela entra no saldo, na barra e no ranking', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  // Digitar 25990 tem que virar 259,90 — a máscara trata dígitos como centavos.
  await page.getByLabel('Valor').fill('25990');
  await expect(page.getByLabel('Valor')).toHaveValue('259,90');

  await page.getByRole('button', { name: 'Mercado' }).click();
  await page.getByLabel('Descrição (opcional)').fill('Compra do mês');
  await page.getByRole('button', { name: 'Lançar' }).click();

  const saldo = page.getByLabel('Saldo do mês');
  await expect(saldo).toContainText('259,90');

  // A barra de limite reflete o gasto: 259,90 de 4.000,00 = 6%.
  const limite = page.getByLabel('Limite de gastos do mês');
  await expect(limite).toContainText('6%');
  await expect(limite).toContainText('Ainda dá para gastar');

  const ranking = page.getByLabel('Gastos por categoria');
  await expect(ranking).toContainText('Mercado');
  await expect(ranking).toContainText('100%');

  await expect(page.getByLabel('Lançamentos do mês')).toContainText('Compra do mês');
});

test('cria uma categoria nova no lançamento e ela fica disponível no próximo', async ({
  page,
}) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('8000');

  await page.getByRole('button', { name: 'Nova' }).click();
  await page.getByPlaceholder('Nome da categoria').fill('Pet');
  await page.getByRole('button', { name: 'Criar', exact: true }).click();

  // Depois de criar, a categoria já fica selecionada.
  const chipPet = page.getByRole('button', { name: 'Pet', exact: true });
  await expect(chipPet).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByLabel('Gastos por categoria')).toContainText('Pet');

  // O requisito central: no PRÓXIMO lançamento a categoria está lá para escolher.
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  // `exact` porque a linha do lançamento também menciona "Pet".
  const chipNoProximo = page.getByRole('button', { name: 'Pet', exact: true });
  await expect(chipNoProximo).toBeVisible();
  await expect(chipNoProximo).toHaveAttribute('aria-pressed', 'false');
});

test('receita e despesa se compensam no saldo', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByRole('radio', { name: 'Receita' }).click();
  await page.getByLabel('Valor').fill('800000');
  await page.getByRole('button', { name: 'Lançar' }).click();

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('25990');
  await page.getByRole('button', { name: 'Lançar' }).click();

  const saldo = page.getByLabel('Saldo do mês');
  await expect(saldo).toContainText('7.740,10');
  await expect(saldo).toContainText('8.000,00');
  await expect(saldo).toContainText('259,90');
});

test('estourar o limite muda o aviso da barra', async ({ page }) => {
  // Limite de R$ 100,00 para estourar com um lançamento só.
  await signInAndCreateCouple(page, '10000');

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('15000');
  await page.getByRole('button', { name: 'Lançar' }).click();

  const limite = page.getByLabel('Limite de gastos do mês');
  await expect(limite).toContainText('150%');
  await expect(limite).toContainText('Passou R$ 50,00 do limite');
});

test('editar e apagar um lançamento', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('5000');
  await page.getByLabel('Descrição (opcional)').fill('Padaria');
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByLabel('Saldo do mês')).toContainText('50,00');

  // Tocar no lançamento abre a folha já preenchida.
  await page.getByRole('button', { name: /Padaria/ }).click();
  await expect(page.getByLabel('Valor')).toHaveValue('50,00');
  await page.getByLabel('Valor').fill('7500');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByLabel('Saldo do mês')).toContainText('75,00');

  await page.getByRole('button', { name: /Padaria/ }).click();
  await page.getByRole('button', { name: 'Apagar lançamento' }).click();
  await page.getByRole('button', { name: 'Apagar', exact: true }).click();
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();
});

test('troca de mês mostra só o que é daquele mês', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('5000');
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByLabel('Saldo do mês')).toContainText('50,00');

  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();
  await expect(page.getByLabel('Saldo do mês')).toContainText('R$ 0,00');

  // O atalho de voltar para o mês atual traz o lançamento de volta.
  await page.getByRole('button', { name: 'voltar para o mês atual' }).click();
  await expect(page.getByLabel('Saldo do mês')).toContainText('50,00');
});

test('despesa parcelada cria uma parcela por mês, ligadas entre si', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('10000');
  await page.getByRole('checkbox', { name: 'Parcelar essa compra' }).check();
  // 10000 centavos (R$ 100,00) em 3x: 33,34 + 33,33 + 33,33.
  await expect(page.getByText('3x de R$ 33,33')).toBeVisible();
  await expect(page.getByText('a primeira de R$ 33,34')).toBeVisible();
  await page.getByLabel('Descrição (opcional)').fill('Geladeira');

  await page.getByRole('button', { name: 'Lançar em 3x' }).click();

  // Só a primeira parcela cai no mês atual.
  const lancamentos = page.getByLabel('Lançamentos do mês');
  await expect(lancamentos).toContainText('Geladeira');
  await expect(lancamentos).toContainText('1/3');
  await expect(page.getByLabel('Saldo do mês')).toContainText('33,34');

  // A segunda parcela aparece no mês seguinte, com o valor sem o arredondamento.
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('2/3');
  await expect(page.getByLabel('Saldo do mês')).toContainText('33,33');

  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('3/3');
});

test('apagar "esta e as seguintes" remove só as parcelas futuras', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('30000');
  await page.getByRole('checkbox', { name: 'Parcelar essa compra' }).check();
  await page.getByRole('button', { name: 'Lançar em 3x' }).click();

  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await page.getByRole('button', { name: /2\/3/ }).click();
  await expect(page.getByText('Parcela 2 de 3')).toBeVisible();
  await page.getByRole('button', { name: 'Apagar esta e as parcelas seguintes' }).click();
  await page.getByRole('button', { name: 'Apagar', exact: true }).click();

  // A parcela 2 sumiu deste mês...
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();

  // ...e a 3 também não existe mais lá na frente.
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();

  // Mas a primeira parcela, já paga, continua no mês de origem.
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(page.getByLabel('Lançamentos do mês')).toContainText('1/3');
});

test('conta a pagar vira check verde quando marcada', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('link', { name: 'Contas' }).click();
  await expect(page.getByText('Nenhuma conta cadastrada')).toBeVisible();

  await page.getByRole('button', { name: 'Nova conta' }).click();
  await page.getByRole('textbox', { name: 'Conta' }).fill('Luz');
  await page.getByLabel('Valor').fill('18050');
  await page.getByRole('button', { name: 'Adicionar conta' }).click();

  await expect(page.getByRole('heading', { name: 'A pagar', exact: true })).toBeVisible();
  await expect(page.getByText('R$ 180,50').first()).toBeVisible();

  const marcar = page.getByRole('button', { name: 'Marcar Luz como paga' });
  await expect(marcar).toHaveAttribute('aria-pressed', 'false');
  await marcar.click();

  // Agora está paga: o botão inverte e a conta muda de seção.
  const desmarcar = page.getByRole('button', { name: 'Marcar Luz como não paga' });
  await expect(desmarcar).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: /Pagas/ })).toBeVisible();
  await expect(page.getByText('Nenhuma conta esperando.')).toBeVisible();

  // E dá para desmarcar de volta.
  await desmarcar.click();
  await expect(page.getByRole('button', { name: 'Marcar Luz como paga' })).toBeVisible();
});

test('exporta planilha e PDF do mês', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('25990');
  await page.getByRole('button', { name: 'Mercado' }).click();
  await page.getByRole('button', { name: 'Lançar' }).click();

  await page.getByRole('link', { name: 'Ajustes' }).click();

  const xlsxDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Planilha' }).click();
  const xlsx = await xlsxDownload;
  expect(xlsx.suggestedFilename()).toMatch(/^fincouple-\d{4}-\d{2}\.xlsx$/);

  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF' }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/^fincouple-\d{4}-\d{2}\.pdf$/);
});

test('alterar o limite em Ajustes muda a barra da tela inicial', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('50000');
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByLabel('Limite de gastos do mês')).toContainText('13%');

  await page.getByRole('link', { name: 'Ajustes' }).click();
  await page.getByRole('button', { name: 'Alterar limite' }).click();
  await page.getByRole('textbox').fill('100000');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.getByRole('link', { name: 'Início' }).click();
  await expect(page.getByLabel('Limite de gastos do mês')).toContainText('50%');
});

test('sem sessão, o app manda para o login', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Fincouple' })).toBeVisible();
});
