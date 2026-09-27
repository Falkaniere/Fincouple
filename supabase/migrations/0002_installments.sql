-- Despesa parcelada: uma compra parcelada vira N lançamentos, um por mês,
-- ligados por installment_group. Cada linha continua sendo um lançamento
-- normal (edita e apaga como qualquer outro) -- os campos abaixo só servem
-- para mostrar "2/3" na lista e, se quiser, apagar as parcelas seguintes de
-- uma vez.

alter table public.transactions
  add column installment_group uuid,
  add column installment_no    smallint,
  add column installment_total smallint;

alter table public.transactions
  add constraint transactions_installment_consistency check (
    -- ou nao e parcelado (as tres colunas nulas), ou e' parcelado de verdade
    -- (as tres preenchidas, dentro de faixa sensata e no <= total).
    -- Os "is not null" explicitos importam: uma comparacao numerica com
    -- NULL vira NULL (nem true nem false), e um CHECK so rejeita quando o
    -- resultado e' false -- NULL passaria batido sem eles.
    (installment_group is null and installment_no is null and installment_total is null)
    or (
      installment_group is not null
      and installment_no is not null
      and installment_total is not null
      and installment_no between 1 and 24
      and installment_total between 2 and 24
      and installment_no <= installment_total
    )
  );

-- Acha rapido as outras parcelas do mesmo grupo (usado por "apagar as
-- parcelas seguintes").
create index transactions_installment_group_idx
  on public.transactions (installment_group)
  where installment_group is not null;
