-- Bloqueio de forca bruta no codigo de convite.
--
-- O codigo tem 6 caracteres de um alfabeto de 32 (~1 bilhao de combinacoes):
-- seguro contra um palpite avulso, mas sem limite de tentativas qualquer
-- pessoa logada poderia chamar join_couple em loop. Agora, 5 codigos errados
-- em 15 minutos travam as tentativas dessa pessoa por 15 minutos.

create table public.join_attempts (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  fail_count   integer not null default 0,
  last_fail_at timestamptz,
  locked_until timestamptz
);

-- Tabela interna: so a funcao abaixo (security definer) mexe nela. RLS ligada
-- e sem nenhuma politica, e sem acesso direto para nenhum role da API.
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from public, anon, authenticated;

-- Atencao: em plpgsql, `raise exception` desfaz a transacao inteira, inclusive
-- o contador de falhas. Por isso um codigo errado NAO levanta erro aqui: a
-- funcao registra a falha e devolve null (o app trata null como "nao
-- encontrado"). So o bloqueio levanta erro -- ele nao precisa gravar nada.
create or replace function public.join_couple(code text)
returns public.couples
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  target public.couples;
  attempts public.join_attempts;
  max_fails constant integer := 5;
  window_len constant interval := interval '15 minutes';
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  insert into public.join_attempts (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  -- Trava a linha: tentativas simultaneas da mesma pessoa se enfileiram.
  select * into attempts
  from public.join_attempts a
  where a.user_id = auth.uid()
  for update;

  if attempts.locked_until is not null and attempts.locked_until > now() then
    raise exception 'too many invalid invite codes' using errcode = 'P0003';
  end if;

  select * into target
  from public.couples c
  where c.invite_code = upper(trim(coalesce(code, '')));

  if target.id is null then
    -- Janela que se reinicia sozinha: falha antiga nao conta mais.
    if attempts.last_fail_at is null or now() - attempts.last_fail_at > window_len then
      attempts.fail_count := 0;
    end if;
    attempts.fail_count := attempts.fail_count + 1;

    update public.join_attempts a
    set fail_count   = attempts.fail_count,
        last_fail_at = now(),
        locked_until = case
          when attempts.fail_count >= max_fails then now() + window_len
          else null
        end
    where a.user_id = auth.uid();

    return null;
  end if;

  -- Codigo certo limpa o historico de falhas.
  update public.join_attempts a
  set fail_count = 0, last_fail_at = null, locked_until = null
  where a.user_id = auth.uid();

  insert into public.couple_members (couple_id, user_id)
  values (target.id, auth.uid())
  on conflict (couple_id, user_id) do nothing;

  return target;
end;
$$;

-- create or replace preserva as permissoes, mas reafirma por seguranca.
revoke all on function public.join_couple(text) from public, anon;
grant execute on function public.join_couple(text) to authenticated;
