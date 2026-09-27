#!/usr/bin/env bash
# Sobe um Postgres local descartavel, aplica a migracao e roda os testes de RLS.
# Nao toca no seu projeto Supabase. Precisa de postgresql-16 instalado.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/tmp/pgdata-fincouple}"
SOCK=/tmp
DB=fincouple_test

if [ ! -d "$PGDATA" ]; then
  rm -rf "$PGDATA"; mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"
  su postgres -c "$PGBIN/initdb -D $PGDATA -A trust" >/dev/null
fi

if ! su postgres -c "$PGBIN/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA \
    -o '-c listen_addresses= -c unix_socket_directories=$SOCK -c wal_level=logical' \
    -l /tmp/pg-fincouple.log start" >/dev/null
  sleep 1
fi

psql -h "$SOCK" -U postgres -qtAc "select 1 from pg_database where datname='$DB'" | grep -q 1 \
  || psql -h "$SOCK" -U postgres -q -c "create database $DB"

# Sempre parte de um banco limpo.
psql -h "$SOCK" -U postgres -d "$DB" -q \
  -c "drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;" >/dev/null

# Todas as migracoes, em ordem -- nao so a inicial.
MIGRATIONS=("$HERE"/../migrations/*.sql)
psql -h "$SOCK" -U postgres -d "$DB" -q -v ON_ERROR_STOP=1 \
  -f "$HERE/00_supabase_stub.sql" \
  "${MIGRATIONS[@]/#/-f}" 2>&1 | grep -v NOTICE || true

psql -h "$SOCK" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$HERE/01_rls_test.sql" \
  | grep -vE '^(SET|DO|INSERT|UPDATE|Pager)'
