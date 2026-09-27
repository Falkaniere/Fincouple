-- Conta recorrente (aluguel, assinatura, etc.): ao marcar como paga, o app
-- cria sozinho a próxima ocorrência, um mês depois, ainda em aberto.
alter table public.bills
  add column is_recurring boolean not null default false;
