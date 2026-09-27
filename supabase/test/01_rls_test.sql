-- Testes das politicas de RLS e das RPCs. Roda contra o stub local.
-- Qualquer falha aborta com `assert`.
\set ON_ERROR_STOP on
\pset pager off

-- Duas pessoas no casal A, uma pessoa no casal B.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'jonatas@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'esposa@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'outro.casal@example.com');

------------------------------------------------------------------ casal A
set role authenticated;
set test.user_id = '11111111-1111-1111-1111-111111111111';

select id as couple_a from public.create_couple('Casa do Jonatas', 400000, 'Jonatas') \gset
set test.couple_a = :'couple_a';
\echo '-> casal A criado'

do $$
declare n int;
begin
  select count(*) into n from public.categories;
  assert n = 10, format('esperava 10 categorias semeadas, achei %s', n);
end $$;

select invite_code as code_a from public.couples where id = :'couple_a' \gset

-- Um lancamento de despesa e uma receita.
insert into public.transactions (couple_id, category_id, kind, amount_cents, occurred_on, description, created_by)
select :'couple_a', c.id, 'expense', 25990, current_date, 'Compra do mes', auth.uid()
from public.categories c where c.name = 'Mercado';

insert into public.transactions (couple_id, kind, amount_cents, occurred_on, created_by)
values (:'couple_a', 'income', 800000, current_date, auth.uid());

insert into public.bills (couple_id, title, amount_cents, due_date)
values (:'couple_a', 'Luz', 18050, current_date + 5);

------------------------------------------------------- a esposa entra pelo codigo
set test.user_id = '22222222-2222-2222-2222-222222222222';

-- Antes de entrar, nao ve nada.
do $$
declare n int;
begin
  select count(*) into n from public.couples;
  assert n = 0, format('quem nao e membro nao deveria ver casal nenhum, viu %s', n);
  select count(*) into n from public.transactions;
  assert n = 0, format('quem nao e membro nao deveria ver lancamento, viu %s', n);
end $$;
\echo '-> antes de entrar, nao ve nada (ok)'

select id as joined from public.join_couple(:'code_a') \gset

do $$
declare n int; total int;
begin
  select count(*) into n from public.transactions;
  assert n = 2, format('a esposa deveria ver os 2 lancamentos, viu %s', n);
  select count(*) into n from public.bills;
  assert n = 1, format('deveria ver 1 conta, viu %s', n);
  select count(*) into n from public.couple_members;
  assert n = 2, format('o casal deveria ter 2 membros, tem %s', n);
  select monthly_limit_cents into total from public.couples;
  assert total = 400000, format('limite errado: %s', total);
end $$;
\echo '-> depois de entrar pelo codigo, ve tudo do casal (ok)'

-- A esposa tambem lanca, e altera o limite mensal.
insert into public.transactions (couple_id, kind, amount_cents, occurred_on, description, created_by)
values (:'couple_a', 'expense', 7500, current_date, 'Farmacia', auth.uid());

update public.couples set monthly_limit_cents = 450000 where id = :'couple_a';

-- Marca a conta como paga (o "check verde").
update public.bills set paid_at = now(), paid_by = auth.uid() where title = 'Luz';

do $$
declare n int;
begin
  select count(*) into n from public.bills where paid_at is not null;
  assert n = 1, 'a conta deveria estar marcada como paga';
end $$;
\echo '-> esposa lanca, muda limite e paga conta (ok)'

------------------------------------------------------------------ casal B (isolamento)
set test.user_id = '33333333-3333-3333-3333-333333333333';

do $$
declare n int;
begin
  select count(*) into n from public.couples;
  assert n = 0, format('o outro casal nao deveria ver o casal A, viu %s', n);
  select count(*) into n from public.transactions;
  assert n = 0, format('o outro casal nao deveria ver lancamentos do A, viu %s', n);
  select count(*) into n from public.categories;
  assert n = 0, format('o outro casal nao deveria ver categorias do A, viu %s', n);
  select count(*) into n from public.bills;
  assert n = 0, format('o outro casal nao deveria ver contas do A, viu %s', n);
end $$;
\echo '-> outro casal nao ve NADA do casal A (ok)'

select id as couple_b from public.create_couple('Casa dos outros', 100000) \gset
set test.couple_b = :'couple_b';

-- Nao pode escrever no casal alheio, mesmo sabendo o uuid.
do $$
begin
  begin
    insert into public.transactions (couple_id, kind, amount_cents, occurred_on)
    values (current_setting('test.couple_a')::uuid, 'expense', 999999, current_date);
    raise exception 'FALHA: conseguiu inserir lancamento no casal alheio';
  exception
    when insufficient_privilege then null; -- esperado: RLS barrou
  end;
end $$;

-- Nem alterar o limite do casal alheio (update nao encontra a linha).
do $$
declare n int;
begin
  update public.couples set monthly_limit_cents = 1 where id = current_setting('test.couple_a')::uuid;
  get diagnostics n = row_count;
  assert n = 0, 'FALHA: alterou o limite do casal alheio';
end $$;
\echo '-> outro casal nao consegue escrever no casal A (ok)'

-- Codigo de convite inexistente falha de forma limpa.
do $$
begin
  begin
    perform public.join_couple('ZZZZZZ');
    raise exception 'FALHA: aceitou codigo inexistente';
  exception
    when no_data_found then null; -- esperado
  end;
end $$;
\echo '-> codigo inexistente e rejeitado (ok)'

-- Nome de categoria duplicado (mesmo com caixa diferente) e barrado.
set test.user_id = '11111111-1111-1111-1111-111111111111';
do $$
begin
  begin
    insert into public.categories (couple_id, name, kind)
    values (current_setting('test.couple_a')::uuid, 'mercado', 'expense');
    raise exception 'FALHA: aceitou categoria duplicada';
  exception
    when unique_violation then null; -- esperado
  end;
end $$;

-- Categoria nova criada na hora (o fluxo do "+ Nova" na folha de lancamento).
insert into public.categories (couple_id, name, kind, color)
values (current_setting('test.couple_a')::uuid, 'Pet', 'expense', '#f472b6');

-- Mas o mesmo nome em OUTRO casal pode -- a unicidade e por casal.
set test.user_id = '33333333-3333-3333-3333-333333333333';
insert into public.categories (couple_id, name, kind) values (current_setting('test.couple_b')::uuid, 'Pet', 'expense');
\echo '-> unicidade de categoria e por casal (ok)'

-- Valor zero ou negativo nao entra.
set test.user_id = '11111111-1111-1111-1111-111111111111';
do $$
begin
  begin
    insert into public.transactions (couple_id, kind, amount_cents, occurred_on)
    values (current_setting('test.couple_a')::uuid, 'expense', 0, current_date);
    raise exception 'FALHA: aceitou valor zero';
  exception
    when check_violation then null;
  end;
end $$;
\echo '-> valor zero e rejeitado (ok)'

-- Agregacao do ranking: despesas do mes por categoria, maior primeiro.
\echo ''
\echo 'Ranking de despesas do mes (casal A):'
select coalesce(c.name, 'Sem categoria') as categoria, sum(t.amount_cents) as centavos
from public.transactions t
left join public.categories c on c.id = t.category_id
where t.kind = 'expense'
  and t.occurred_on >= date_trunc('month', current_date)
  and t.occurred_on < date_trunc('month', current_date) + interval '1 month'
group by 1
order by 2 desc;

do $$
declare gasto int; receita int;
begin
  select coalesce(sum(amount_cents), 0) into gasto from public.transactions where kind = 'expense';
  select coalesce(sum(amount_cents), 0) into receita from public.transactions where kind = 'income';
  assert gasto = 33490, format('gasto esperado 33490, veio %s', gasto);
  assert receita = 800000, format('receita esperada 800000, veio %s', receita);
end $$;
\echo '-> totais do mes conferem (ok)'

-- Despesa parcelada: 3 parcelas ligadas pelo mesmo grupo.
do $$
declare
  grupo uuid := gen_random_uuid();
  categoria uuid;
begin
  select id into categoria from public.categories where couple_id = current_setting('test.couple_a')::uuid and name = 'Mercado';

  insert into public.transactions
    (couple_id, category_id, kind, amount_cents, occurred_on, description,
     installment_group, installment_no, installment_total)
  values
    (current_setting('test.couple_a')::uuid, categoria, 'expense', 3334, current_date, 'Geladeira', grupo, 1, 3),
    (current_setting('test.couple_a')::uuid, categoria, 'expense', 3333, current_date + 30, 'Geladeira', grupo, 2, 3),
    (current_setting('test.couple_a')::uuid, categoria, 'expense', 3333, current_date + 60, 'Geladeira', grupo, 3, 3);
end $$;
\echo '-> parcelas validas sao aceitas (ok)'

-- Parcela alem do total declarado e' rejeitada.
do $$
begin
  begin
    insert into public.transactions
      (couple_id, kind, amount_cents, occurred_on, installment_group, installment_no, installment_total)
    values
      (current_setting('test.couple_a')::uuid, 'expense', 100, current_date,
       gen_random_uuid(), 4, 3);
    raise exception 'FALHA: aceitou parcela 4 de 3';
  exception
    when check_violation then null;
  end;
end $$;

-- So grupo sem numero/total (ou vice-versa) tambem e' rejeitado: e' tudo ou nada.
do $$
begin
  begin
    insert into public.transactions (couple_id, kind, amount_cents, occurred_on, installment_group)
    values (current_setting('test.couple_a')::uuid, 'expense', 100, current_date, gen_random_uuid());
    raise exception 'FALHA: aceitou grupo sem numero/total da parcela';
  exception
    when check_violation then null;
  end;
end $$;
\echo '-> parcelamento inconsistente e rejeitado (ok)'

-- leave_couple remove so a propria pessoa.
select public.leave_couple(current_setting('test.couple_a')::uuid);
do $$
declare n int;
begin
  select count(*) into n from public.couples;
  assert n = 0, format('depois de sair nao deveria ver o casal, viu %s', n);
end $$;
\echo '-> leave_couple funciona (ok)'

reset role;
\echo ''
\echo '================ TODOS OS TESTES DE RLS PASSARAM ================'
