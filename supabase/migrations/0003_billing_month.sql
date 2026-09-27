-- Mês da fatura: um gasto de cartão de crédito feito hoje pode não contar
-- no mês corrente, porque a fatura já fechou. Cada cartão vira num dia
-- diferente, então isso não pode ser uma regra automática -- é uma escolha
-- da pessoa, lançamento por lançamento.
--
-- `billing_month`: quando preenchido (sempre o dia 1 de um mês), o
-- lançamento conta nesse mês em vez do mês da data real da compra.
-- `effective_month`: coluna calculada que a tela inicial e as exportações
-- usam para filtrar -- cai no billing_month quando existe, senão no mês da
-- própria data. Ninguém escreve nela diretamente.

alter table public.transactions
  add column billing_month date;

alter table public.transactions
  add constraint transactions_billing_month_is_month_start check (
    billing_month is null or billing_month = date_trunc('month', billing_month)::date
  );

alter table public.transactions
  add column effective_month date generated always as (
    -- date_trunc não é imutável o bastante para coluna gerada (a Postgres
    -- recusa com "generation expression is not immutable"); make_date +
    -- extract dão o primeiro dia do mês sem depender de timezone.
    coalesce(
      billing_month,
      make_date(extract(year from occurred_on)::int, extract(month from occurred_on)::int, 1)
    )
  ) stored;

-- Substitui o índice antigo (só occurred_on): a tela inicial agora filtra
-- por effective_month, mas ainda ordena pela data real da compra.
drop index if exists transactions_couple_month_idx;
create index transactions_couple_effective_month_idx
  on public.transactions (couple_id, effective_month, occurred_on desc);
