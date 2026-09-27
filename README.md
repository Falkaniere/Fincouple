# Fincouple

Controle financeiro compartilhado para casais. Os dois entram no mesmo
controle: o que um lança aparece no celular do outro em segundos.

É um web app (PWA) — não passa por loja de aplicativos. Abre no navegador e
pode ser adicionado à tela inicial com ícone próprio.

## O que ele faz

- **Tela inicial** com o saldo do mês, uma barra de gasto/limite e o ranking de
  categorias que mais consumiram dinheiro, da maior para a menor.
- **Lançamentos** de despesa e receita, com criação de categoria na hora — a
  categoria nova já fica selecionada e aparece nos próximos lançamentos.
  Tocar num lançamento edita ou apaga.
- **Despesa parcelada**: você digita o valor de cada parcela (o número que
  vai aparecer todo mês) e o número de parcelas, até 24x. Nenhum valor é
  dividido nem arredondado — todas as parcelas saem idênticas, uma por mês.
  Dá para apagar só uma parcela ou "esta e as seguintes".
- **Mês da fatura**: para despesas de cartão, marca "É despesa de cartão de
  crédito" e escolhe em que mês ela deve contar — útil quando a fatura já
  fechou e o gasto de hoje só vai aparecer na fatura do mês seguinte. Como
  cada cartão vira num dia diferente, isso nunca é automático: é sempre uma
  escolha, lançamento por lançamento.
- **Contas a pagar** numa aba própria: toca no botão, ela fica verde com um
  check. Tocar no nome da conta edita ou apaga — cadastrou errado, corrige
  ali mesmo, sem precisar apagar e recriar.
- **Exportar** o mês em planilha (`.xlsx`) e em PDF.
- **Instalar na tela inicial**, com o convite aparecendo depois do login.

## Como funciona o acesso

Login por **link mágico no email** — sem senha. Quem cria o controle recebe um
**código de 6 letras** (ex. `ABC234`) e manda para a outra pessoa, que entra
com o código depois de fazer o próprio login.

Trocar de celular não perde nada: os dados ficam no banco, não no aparelho.

Cada casal só enxerga os próprios dados. Isso não depende do app se comportar
bem: está imposto no banco por *Row Level Security*, e há testes que provam
(veja [Testes](#testes)).

## Pôr no ar

Leva uns 10 minutos. Você precisa de uma conta no Supabase (grátis) e uma na
Vercel (grátis).

### 1. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e
   rode. Isso cria as tabelas, as regras de segurança e liga o tempo real.
3. Em **Project Settings → API**, copie a *Project URL* e a chave
   *anon public*.

> A chave *anon* pode ficar no navegador — é o desenho do Supabase. Quem
> protege os dados é a RLS. **Nunca** use a chave `service_role` aqui.

### 2. Publicar na Vercel

1. Importe este repositório na [Vercel](https://vercel.com/new).
2. Em **Settings → Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | a *Project URL* do passo 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave *anon public* do passo 1 |

3. Faça o deploy.

> Estas variáveis são embutidas no build. Se mudar alguma depois, **faça um
> novo deploy** — só salvar não basta.

### 3. Apontar o Supabase para o seu domínio

No Supabase, em **Authentication → URL Configuration**:

- **Site URL**: o endereço da Vercel (ex. `https://fincouple.vercel.app`).
- **Redirect URLs**: adicione `https://SEU-DOMINIO/auth/callback`.

Sem isso o link do email leva para o lugar errado.

### 4. (Recomendado) Email próprio

O envio de email do Supabase no plano gratuito é limitado a poucas mensagens
por hora e às vezes cai no spam. Para o uso de um casal costuma bastar; se for
usar com mais gente, configure um SMTP próprio em
**Project Settings → Authentication → SMTP Settings**. O
[Resend](https://resend.com) tem plano gratuito e resolve.

## Rodando na sua máquina

```bash
npm install
cp .env.example .env.local   # preencha as duas variáveis
npm run dev
```

Abra <http://localhost:3000>. Adicione `http://localhost:3000/auth/callback`
nas *Redirect URLs* do Supabase para o link do email funcionar localmente.

## Testes

```bash
npm run check   # tipos + lint + testes de lógica
npm test        # dinheiro, datas e agregação do ranking
npm run test:db # regras de segurança, num Postgres local descartável
npm run test:e2e # o app inteiro num navegador
```

Três camadas, cada uma cobrindo o que as outras não alcançam:

- **`npm test`** — funções puras: máscara e arredondamento de dinheiro (por
  isso tudo é guardado em centavos inteiros), virada de mês no fuso de São
  Paulo, ano bissexto, e a agregação que monta o ranking.
- **`npm run test:db`** — sobe um Postgres local, aplica a migração e prova que
  um casal **não vê nem escreve** nada do outro, que o código de convite
  funciona, e que categoria duplicada e valor zero são recusados. Precisa de
  `postgresql-16` instalado; não toca no seu projeto Supabase.
- **`npm run test:e2e`** — roda o app de produção num Chromium de verdade,
  contra um Supabase falso em memória
  ([`e2e/fake-supabase-server.mjs`](e2e/fake-supabase-server.mjs)), e percorre
  login, criação do casal, lançamento com categoria nova, troca de mês, o
  check verde das contas e as duas exportações.

## Como conferir a dois celulares

Depois de publicar, o roteiro que vale a pena fazer uma vez:

1. Crie o controle no seu celular e copie o código.
2. No celular da sua esposa, faça login com o email dela e entre com o código.
3. Lance uma despesa num aparelho e veja aparecer **no outro, sem recarregar**.
4. Crie uma categoria nova durante um lançamento e confirme que ela aparece na
   lista do próximo.
5. Marque uma conta como paga e veja ela ficar verde nos dois.
6. Exporte a planilha e o PDF.
7. Aceite o convite "Adicione à tela inicial".

## Estrutura

```
supabase/migrations/   schema, RLS e funções do banco
supabase/test/         testes das regras de segurança
src/lib/               dinheiro, datas, agregação, exportações, Supabase
src/hooks/             consultas e mutações (React Query) e o tempo real
src/components/        telas e componentes
src/app/               rotas (App Router)
src/proxy.ts           renova a sessão e protege as rotas
e2e/                   testes de navegador e o Supabase falso
```

## Notas

- **Dinheiro em centavos.** Todo valor é um inteiro de centavos, no banco e no
  código. Float em dinheiro dá diferença de um centavo no saldo.
- **Instalar no iPhone.** O iOS não permite instalar por botão — nenhum site
  consegue. Lá o convite mostra a instrução do menu *Compartilhar*. No Android
  o botão instala de verdade.
- **Offline.** O app precisa de internet: são dados ao vivo, compartilhados.
  O service worker guarda só a casca do app, para o atalho abrir rápido e
  mostrar um aviso decente quando a conexão cair. Nenhum dado do casal é
  guardado em cache.
