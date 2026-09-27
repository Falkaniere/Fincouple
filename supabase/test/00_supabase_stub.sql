-- Stub minimo do que o Supabase fornece, para poder rodar a migracao e testar
-- as politicas de RLS num Postgres local. Nao vai para producao.
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- No Supabase, auth.uid() le o claim `sub` do JWT em request.jwt.claims.
-- Aqui lemos um GUC simples para simular "quem esta logado".
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.user_id', true), '')::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant select on auth.users to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
