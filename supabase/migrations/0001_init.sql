-- Fincouple - schema inicial
-- Controle financeiro compartilhado por casal.
-- Todo valor monetario e guardado em centavos (integer) para nao haver erro de ponto flutuante.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tabelas

create table public.couples (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(trim(name)) between 1 and 80),
  invite_code         text not null unique,
  monthly_limit_cents integer not null default 0 check (monthly_limit_cents >= 0),
  created_at          timestamptz not null default now()
);

create table public.couple_members (
  couple_id    uuid not null references public.couples (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create index couple_members_user_id_idx on public.couple_members (user_id);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  kind       text not null default 'expense' check (kind in ('expense', 'income')),
  color      text not null default '#64748b',
  created_at timestamptz not null default now()
);

-- Impede "Mercado" e "mercado" convivendo no mesmo casal.
create unique index categories_couple_name_kind_key
  on public.categories (couple_id, lower(trim(name)), kind);

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  kind        text not null check (kind in ('expense', 'income')),
  -- > 0 sempre: o sinal vem de `kind`, nunca do valor.
  amount_cents integer not null check (amount_cents > 0),
  occurred_on  date not null default current_date,
  description  text check (char_length(description) <= 140),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index transactions_couple_month_idx on public.transactions (couple_id, occurred_on desc);
-- Cobrem as chaves estrangeiras: sem isso, apagar uma categoria ou uma
-- pessoa faz o Postgres varrer a tabela inteira (on delete set null).
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_created_by_idx  on public.transactions (created_by);

create table public.bills (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title        text not null check (char_length(trim(title)) between 1 and 80),
  amount_cents integer not null check (amount_cents >= 0),
  due_date     date not null,
  -- null = em aberto; preenchido = paga (o "check verde" da interface).
  paid_at      timestamptz,
  paid_by      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index bills_couple_due_idx on public.bills (couple_id, due_date);
create index bills_category_id_idx on public.bills (category_id);
create index bills_paid_by_idx     on public.bills (paid_by);

-- ---------------------------------------------------------------- helpers

-- `security definer` para a politica poder ler couple_members sem cair na
-- propria RLS de couple_members (recursao infinita).
create or replace function public.is_couple_member(target_couple uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.couple_members m
    where m.couple_id = target_couple
      and m.user_id = auth.uid()
  );
$$;

-- Codigo curto, sem caracteres ambiguos (0/O, 1/I), facil de ditar no WhatsApp.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.couples c where c.invite_code = candidate);
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------- RPCs

-- Cria o casal, ja adiciona quem chamou como membro e semeia as categorias
-- padrao -- tudo numa transacao, para nunca sobrar um casal sem membro.
create or replace function public.create_couple(
  couple_name text,
  monthly_limit_cents integer default 0,
  display_name text default null
)
returns public.couples
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  new_couple public.couples;
  seed_name text;
  seed_color text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if couple_name is null or char_length(trim(couple_name)) = 0 then
    raise exception 'couple_name is required' using errcode = '22023';
  end if;

  insert into public.couples (name, invite_code, monthly_limit_cents)
  values (trim(couple_name), public.generate_invite_code(), greatest(coalesce(monthly_limit_cents, 0), 0))
  returning * into new_couple;

  insert into public.couple_members (couple_id, user_id, display_name)
  values (new_couple.id, auth.uid(), nullif(trim(coalesce(display_name, '')), ''));

  for seed_name, seed_color in
    select * from (values
      ('Mercado',     '#16a34a'),
      ('Moradia',     '#0ea5e9'),
      ('Transporte',  '#f59e0b'),
      ('Restaurante', '#ef4444'),
      ('Lazer',       '#a855f7'),
      ('Saúde',       '#14b8a6'),
      ('Assinaturas', '#6366f1'),
      ('Outros',      '#64748b')
    ) as seeds(n, c)
  loop
    insert into public.categories (couple_id, name, kind, color)
    values (new_couple.id, seed_name, 'expense', seed_color);
  end loop;

  insert into public.categories (couple_id, name, kind, color)
  values (new_couple.id, 'Salário', 'income', '#22c55e'),
         (new_couple.id, 'Outras receitas', 'income', '#84cc16');

  return new_couple;
end;
$$;

-- Entra num casal existente pelo codigo do convite.
create or replace function public.join_couple(code text)
returns public.couples
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  target public.couples;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into target
  from public.couples c
  where c.invite_code = upper(trim(coalesce(code, '')));

  if target.id is null then
    raise exception 'invite code not found' using errcode = 'P0002';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (target.id, auth.uid())
  on conflict (couple_id, user_id) do nothing;

  return target;
end;
$$;

-- Deixar o casal (usado em Ajustes para trocar de controle).
create or replace function public.leave_couple(target_couple uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.couple_members m
  where m.couple_id = target_couple
    and m.user_id = auth.uid();
end;
$$;

-- O Supabase concede EXECUTE a `anon`/`authenticated` por privilegio padrao
-- do schema public, direto para esses roles -- "revoke ... from public" nao
-- alcanca isso (public aqui e' o pseudo-role, nao o schema). Por isso as
-- funcoes ja se protegem sozinhas checando auth.uid(), e aqui fechamos o
-- acesso por completo: nada fica exposto a quem nao esta logado, e a
-- puramente interna (generate_invite_code) nao fica exposta nem a quem esta.
revoke all on function public.create_couple(text, integer, text) from public, anon;
revoke all on function public.join_couple(text) from public, anon;
revoke all on function public.leave_couple(uuid) from public, anon;
revoke all on function public.is_couple_member(uuid) from public, anon;
revoke all on function public.generate_invite_code() from public, anon, authenticated;
grant execute on function public.create_couple(text, integer, text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.leave_couple(uuid) to authenticated;
-- Helper interno de RLS: so precisa ser executavel por quem avalia as
-- politicas (authenticated), nunca via RPC anonimo.
grant execute on function public.is_couple_member(uuid) to authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.couples         enable row level security;
alter table public.couple_members  enable row level security;
alter table public.categories      enable row level security;
alter table public.transactions    enable row level security;
alter table public.bills           enable row level security;

-- couples: le e atualiza (limite mensal, nome) somente o proprio casal.
-- Nao ha politica de insert: criar casal passa obrigatoriamente por create_couple(),
-- que garante o invite_code e o membro inicial.
create policy couples_select on public.couples
  for select to authenticated
  using (public.is_couple_member(id));

create policy couples_update on public.couples
  for update to authenticated
  using (public.is_couple_member(id))
  with check (public.is_couple_member(id));

-- couple_members: cada pessoa ve os membros do seu casal e pode remover a si mesma.
create policy couple_members_select on public.couple_members
  for select to authenticated
  using (public.is_couple_member(couple_id));

-- `(select auth.uid())` em vez de `auth.uid()` direto: sem o select, o
-- Postgres reavalia a funcao a cada linha varrida pela politica; com ele,
-- calcula uma vez so (initplan). As outras politicas ja usam esse formato.
create policy couple_members_update_self on public.couple_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy couple_members_delete_self on public.couple_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- categories / transactions / bills: acesso total dentro do proprio casal.
create policy categories_all on public.categories
  for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy transactions_all on public.transactions
  for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy bills_all on public.bills
  for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- ---------------------------------------------------------------- realtime

-- Faz o lancamento de um aparecer no celular do outro sem recarregar.
-- `replica identity full` garante que o payload de delete traga couple_id,
-- que e o filtro usado na assinatura do cliente.
alter table public.transactions replica identity full;
alter table public.bills        replica identity full;
alter table public.categories   replica identity full;
alter table public.couples      replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.bills;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.couples;
