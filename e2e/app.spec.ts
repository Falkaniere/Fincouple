import { expect, test, type Locator, type Page } from '@playwright/test';

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

test('mês da fatura faz a despesa de cartão contar em outro mês', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('5000');
  await page.getByRole('checkbox', { name: 'É despesa de cartão de crédito' }).check();
  // Sugestão automática é o mês seguinte -- a pessoa pode aceitar ou trocar.
  await expect(page.getByText(/Vai contar no saldo de/)).toBeVisible();
  await page.getByLabel('Descrição (opcional)').fill('Compra no cartão');
  await page.getByRole('button', { name: 'Lançar' }).click();

  // A compra some do mês atual...
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();
  await expect(page.getByLabel('Saldo do mês')).toContainText('R$ 0,00');

  // ...e aparece no mês seguinte, marcada como fatura.
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  const lancamentos = page.getByLabel('Lançamentos do mês');
  await expect(lancamentos).toContainText('Compra no cartão');
  await expect(lancamentos).toContainText('(fatura)');
  await expect(page.getByLabel('Saldo do mês')).toContainText('50,00');
});

test('editar o mês da fatura move o lançamento para o mês certo', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('3000');
  await page.getByLabel('Descrição (opcional)').fill('Farmácia');
  await page.getByRole('button', { name: 'Lançar' }).click();
  await expect(page.getByLabel('Lançamentos do mês')).toContainText('Farmácia');

  // Duas viradas de fatura à frente, calculado sem fixar o ano no teste.
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const targetMonthKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;

  await page.getByRole('button', { name: /Farmácia/ }).click();
  await page.getByRole('checkbox', { name: 'É despesa de cartão de crédito' }).check();
  await page.locator('input[type="month"]').fill(targetMonthKey);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  // Saiu do mês original...
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();

  // ...e chegou exatamente dois meses à frente, marcada como fatura.
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  const lancamentos = page.getByLabel('Lançamentos do mês');
  await expect(lancamentos).toContainText('Farmácia');
  await expect(lancamentos).toContainText('(fatura)');

  // E desmarcar o cartão devolve o lançamento para o mês da própria data.
  await page.getByRole('button', { name: /Farmácia/ }).click();
  await page.getByRole('checkbox', { name: 'É despesa de cartão de crédito' }).uncheck();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();

  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(page.getByLabel('Lançamentos do mês')).toContainText('Farmácia');
});

test('despesa parcelada cria uma parcela por mês, todas com o mesmo valor', async ({
  page,
}) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  // O valor digitado é o de CADA parcela -- nada é dividido, então
  // R$ 33,33 não vira R$ 33,3333... em lugar nenhum: as três parcelas saem
  // idênticas e o total (R$ 99,99) é só multiplicação.
  await page.getByLabel('Valor').fill('3333');
  await page.getByRole('checkbox', { name: 'Parcelar essa compra' }).check();
  await expect(page.getByText('3x de R$ 33,33 = R$ 99,99')).toBeVisible();
  await page.getByLabel('Descrição (opcional)').fill('Geladeira');

  await page.getByRole('button', { name: 'Lançar em 3x' }).click();

  // Só a primeira parcela cai no mês atual, com o valor cheio da parcela.
  const lancamentos = page.getByLabel('Lançamentos do mês');
  await expect(lancamentos).toContainText('Geladeira');
  await expect(lancamentos).toContainText('1/3');
  await expect(page.getByLabel('Saldo do mês')).toContainText('33,33');

  // A segunda e a terceira parcela valem exatamente o mesmo.
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('2/3');
  await expect(page.getByLabel('Saldo do mês')).toContainText('33,33');

  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('3/3');
  await expect(page.getByLabel('Saldo do mês')).toContainText('33,33');
});

test('compra parcelada no cartão soma o mês da fatura à data de cada parcela', async ({
  page,
}) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('10000');
  await page.getByRole('checkbox', { name: 'Parcelar essa compra' }).check();
  await page.getByRole('checkbox', { name: 'É despesa de cartão de crédito' }).check();
  // Sugestão automática (mês seguinte ao da data) fica valendo para a
  // primeira parcela; as próximas andam a partir dela.
  await page.getByLabel('Descrição (opcional)').fill('Notebook');
  await page.getByRole('button', { name: 'Lançar em 3x' }).click();

  // A compra some do mês da data (a fatura empurrou tudo um mês à frente).
  await expect(page.getByText('Nada lançado neste mês')).toBeVisible();

  const lancamentos = page.getByLabel('Lançamentos do mês');
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('Notebook');
  await expect(lancamentos).toContainText('1/3');
  await expect(lancamentos).toContainText('(fatura)');

  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('2/3');

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
  await expect(page.getByText('Numeração da parcela')).toBeVisible();
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

test('compra que já vinha sendo paga começa direto na parcela informada', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('10000');
  await page.getByRole('checkbox', { name: 'Parcelar essa compra' }).check();

  // Total real da compra: 12x.
  for (let i = 0; i < 9; i += 1) {
    await page.getByRole('button', { name: 'Mais parcelas' }).click();
  }
  await expect(page.getByText('12x', { exact: true })).toBeVisible();

  // Já vinha pagando fora do app -- só falta lançar da 8ª parcela em diante.
  await page.getByRole('checkbox', { name: 'Já vinha pagando antes de lançar aqui' }).check();
  for (let i = 0; i < 6; i += 1) {
    await page.getByRole('button', { name: 'Parcela inicial seguinte' }).click();
  }
  await expect(page.getByText('Cria as parcelas 8 a 12')).toBeVisible();

  await page.getByLabel('Descrição (opcional)').fill('Notebook usado');
  await page.getByRole('button', { name: 'Lançar parcelas 8 a 12' }).click();

  const lancamentos = page.getByLabel('Lançamentos do mês');
  await expect(lancamentos).toContainText('8/12');

  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('9/12');
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('10/12');
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('11/12');
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('12/12');
});

test('corrigir a numeração de uma parcela reflete nas parcelas passadas e futuras', async ({
  page,
}) => {
  await signInAndCreateCouple(page);

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await page.getByLabel('Valor').fill('20000');
  await page.getByRole('checkbox', { name: 'Parcelar essa compra' }).check();
  await page.getByRole('button', { name: 'Lançar em 3x' }).click();

  // Abre a parcela do meio (2/3) e corrige: na verdade é a 6ª de 12.
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await page.getByRole('button', { name: /2\/3/ }).click();
  await expect(page.getByText('Numeração da parcela')).toBeVisible();

  for (let i = 0; i < 9; i += 1) {
    await page.getByRole('button', { name: 'Mais parcelas no total' }).click();
  }
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Parcela seguinte' }).click();
  }
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  const lancamentos = page.getByLabel('Lançamentos do mês');
  await expect(lancamentos).toContainText('6/12');

  // Para trás: a parcela do mês anterior (era 1/3) virou 5/12.
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await expect(lancamentos).toContainText('5/12');

  // Pra frente: a parcela de dois meses à frente (era 3/3) virou 7/12.
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await page.getByRole('button', { name: 'Mês seguinte' }).click();
  await expect(lancamentos).toContainText('7/12');
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

test('editar uma conta corrige o cadastro sem precisar apagar e recriar', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('link', { name: 'Contas' }).click();
  await page.getByRole('button', { name: 'Nova conta' }).click();
  await page.getByRole('textbox', { name: 'Conta' }).fill('Luz');
  await page.getByLabel('Valor').fill('18050');
  await page.getByRole('button', { name: 'Adicionar conta' }).click();

  // Tocar na conta abre a folha já preenchida, com "Editar conta" no título.
  await page.getByRole('button', { name: 'Editar Luz' }).click();
  await expect(page.getByRole('heading', { name: 'Editar conta' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Conta' })).toHaveValue('Luz');
  await expect(page.getByLabel('Valor')).toHaveValue('180,50');

  // Corrige o valor e o nome sem apagar nada.
  await page.getByRole('textbox', { name: 'Conta' }).fill('Luz - conta certa');
  await page.getByLabel('Valor').fill('19999');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByText('Luz - conta certa')).toBeVisible();
  await expect(page.getByText('R$ 199,99').first()).toBeVisible();
  // O cadastro errado não existe mais como registro separado.
  await expect(page.getByText('R$ 180,50')).toHaveCount(0);
});

test('apagar conta pela folha de edição some com ela da lista', async ({ page }) => {
  await signInAndCreateCouple(page);

  await page.getByRole('link', { name: 'Contas' }).click();
  await page.getByRole('button', { name: 'Nova conta' }).click();
  await page.getByRole('textbox', { name: 'Conta' }).fill('Internet');
  await page.getByLabel('Valor').fill('9990');
  await page.getByRole('button', { name: 'Adicionar conta' }).click();

  await page.getByRole('button', { name: 'Editar Internet' }).click();
  await page.getByRole('button', { name: 'Apagar conta' }).click();
  await page.getByRole('button', { name: 'Apagar', exact: true }).click();

  await expect(page.getByText('Nenhuma conta cadastrada')).toBeVisible();
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

test('importa gastos de um extrato em csv, com categoria sugerida', async ({ page }) => {
  await signInAndCreateCouple(page);

  // Datas sem ano, como muita fatura mostra -- o import assume o ano do mês
  // que já está selecionado na tela, então usa a data de hoje para o
  // lançamento cair no mês corrente sem precisar trocar de mês no teste.
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dataHoje = `${dd}/${mm}`;

  const csv = [
    'Data;Descrição;Valor',
    `${dataHoje};UBER *VIAGEM;32,50`,
    `${dataHoje};SUPERMERCADO CARREFOUR;158,90`,
    `${dataHoje};PAGAMENTO RECEBIDO;-500,00`,
  ].join('\n');

  await page.getByRole('button', { name: 'Importar gastos de um extrato' }).click();
  await expect(page.getByRole('heading', { name: 'Importar gastos' })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'fatura.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8'),
  });

  // As duas compras vêm marcadas, com categoria já sugerida; o pagamento
  // (valor negativo) não é uma compra e chega desmarcado.
  await expect(page.getByText('2 de 3 selecionados')).toBeVisible();

  const selectedLabel = (select: Locator) =>
    select.evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.textContent);

  const uberRow = page.locator('li').filter({ has: page.locator('input[value="UBER *VIAGEM"]') });
  const carrefourRow = page
    .locator('li')
    .filter({ has: page.locator('input[value="SUPERMERCADO CARREFOUR"]') });

  await expect(uberRow).toBeVisible();
  await expect(carrefourRow).toBeVisible();
  expect(await selectedLabel(uberRow.getByLabel('Categoria'))).toBe('Transporte');
  expect(await selectedLabel(carrefourRow.getByLabel('Categoria'))).toBe('Mercado');

  await page.getByRole('button', { name: /^Importar 2 lançamentos$/ }).click();

  const lancamentos = page.getByLabel('Lançamentos do mês');
  await expect(lancamentos).toContainText('UBER *VIAGEM');
  await expect(lancamentos).toContainText('SUPERMERCADO CARREFOUR');
  await expect(lancamentos).not.toContainText('PAGAMENTO RECEBIDO');

  // 32,50 + 158,90 -- o pagamento ficou de fora por vir desmarcado.
  await expect(page.getByLabel('Saldo do mês')).toContainText('191,40');
});

test('sem sessão, o app manda para o login', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Fincouple' })).toBeVisible();
});
