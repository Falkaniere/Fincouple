/**
 * Servidor que imita a API do Supabase (Auth + PostgREST) em memória.
 *
 * Existe para rodar o app inteiro — servidor Next e navegador — sem precisar de
 * um projeto Supabase nem de Docker. As regras de segurança (RLS) e o SQL NÃO
 * são exercitados aqui: isso é testado direto no Postgres, em supabase/test/.
 * O que este servidor prova é que o app real funciona ponta a ponta no
 * navegador: telas, formulários, navegação e exportações.
 */
import { createServer } from 'node:http';

/**
 * Simula a coluna gerada `effective_month` do Postgres real: cai no
 * billing_month quando existe, senão no primeiro dia do mês da própria data.
 */
function computeEffectiveMonth(row) {
  if (row.billing_month) return row.billing_month;
  if (row.occurred_on) return `${row.occurred_on.slice(0, 7)}-01`;
  return null;
}

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'jonatas@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const DEFAULT_CATEGORIES = [
  ['Mercado', '#16a34a', 'expense'],
  ['Moradia', '#0ea5e9', 'expense'],
  ['Transporte', '#f59e0b', 'expense'],
  ['Restaurante', '#ef4444', 'expense'],
  ['Lazer', '#a855f7', 'expense'],
  ['Saúde', '#14b8a6', 'expense'],
  ['Assinaturas', '#6366f1', 'expense'],
  ['Outros', '#64748b', 'expense'],
  ['Salário', '#22c55e', 'income'],
  ['Outras receitas', '#84cc16', 'income'],
];

const state = {
  couples: [],
  couple_members: [],
  categories: [],
  transactions: [],
  bills: [],
};

let idCounter = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}`;

function session() {
  return {
    access_token: 'fake-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'fake-refresh-token',
    user: USER,
  };
}

/**
 * Compara numericamente quando os dois lados são número (ex.: installment_no);
 * cai para string nos outros casos (datas ISO comparam certo como string,
 * já que são sempre do mesmo tamanho e zero-padded).
 */
function compare(cell, value) {
  const cellNum = Number(cell);
  const valueNum = Number(value);
  if (cell !== null && cell !== '' && !Number.isNaN(cellNum) && !Number.isNaN(valueNum)) {
    return cellNum < valueNum ? -1 : cellNum > valueNum ? 1 : 0;
  }
  const a = String(cell);
  return a < value ? -1 : a > value ? 1 : 0;
}

/** Filtros do PostgREST que o app usa: eq, gte, lt. */
function matches(row, params) {
  for (const [key, raw] of params.entries()) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    const cell = row[key];
    if (op === 'eq' && String(cell) !== value) return false;
    if (op === 'gte' && compare(cell, value) < 0) return false;
    if (op === 'lt' && compare(cell, value) >= 0) return false;
    if (op === 'is' && !(value === 'null' ? cell === null : String(cell) === value)) return false;
  }
  return true;
}

function applyOrder(rows, params) {
  const orders = params.getAll('order');
  if (!orders.length) return rows;
  return [...rows].sort((a, b) => {
    for (const spec of orders) {
      const [column, direction = 'asc'] = spec.split('.');
      const cmp = String(a[column] ?? '').localeCompare(String(b[column] ?? ''));
      if (cmp !== 0) return direction.startsWith('desc') ? -cmp : cmp;
    }
    return 0;
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

function rpc(name, body) {
  if (name === 'create_couple') {
    const couple = {
      id: uuid(),
      name: body.couple_name,
      invite_code: 'ABC234',
      monthly_limit_cents: body.monthly_limit_cents ?? 0,
      created_at: new Date().toISOString(),
    };
    state.couples.push(couple);
    state.couple_members.push({
      couple_id: couple.id,
      user_id: USER.id,
      display_name: body.display_name ?? null,
      joined_at: new Date().toISOString(),
    });
    for (const [name_, color, kind] of DEFAULT_CATEGORIES) {
      state.categories.push({
        id: uuid(),
        couple_id: couple.id,
        name: name_,
        kind,
        color,
        created_at: new Date().toISOString(),
      });
    }
    return [200, couple];
  }

  if (name === 'join_couple') {
    const couple = state.couples.find((c) => c.invite_code === String(body.code).toUpperCase());
    if (!couple) return [404, { message: 'invite code not found', code: 'P0002' }];
    return [200, couple];
  }

  if (name === 'leave_couple') {
    state.couple_members = state.couple_members.filter((m) => m.couple_id !== body.target_couple);
    state.couples = state.couples.filter((c) => c.id !== body.target_couple);
    return [200, null];
  }

  return [404, { message: `unknown function ${name}` }];
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Com `.single()` o supabase-js pede este Accept e o PostgREST responde um
  // objeto em vez de uma lista. Sem isso, `.single()` devolve lixo.
  const wantsSingle = (req.headers.accept ?? '').includes('vnd.pgrst.object+json');
  const maybeSingle = (rows) => (wantsSingle ? (rows[0] ?? null) : rows);

  const send = (status, body) => {
    res.writeHead(status, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    });
    res.end(JSON.stringify(body ?? null));
  };

  if (req.method === 'OPTIONS') return send(200, {});

  // ---- estado do teste
  if (url.pathname === '/__state') {
    if (req.method === 'POST') {
      for (const key of Object.keys(state)) state[key] = [];
      idCounter = 0;
      return send(200, { reset: true });
    }
    return send(200, state);
  }

  // ---- Auth
  if (url.pathname.startsWith('/auth/v1')) {
    if (url.pathname.endsWith('/otp')) return send(200, {});
    if (url.pathname.endsWith('/logout')) return send(204, null);
    if (url.pathname.endsWith('/token')) return send(200, session());
    if (url.pathname.endsWith('/user')) return send(200, USER);
    if (url.pathname.endsWith('/settings')) {
      return send(200, { external: {}, disable_signup: false, mailer_autoconfirm: false });
    }
    return send(200, {});
  }

  // ---- PostgREST
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const [status, body] = rpc(url.pathname.split('/').pop(), (await readBody(req)) ?? {});
    return send(status, body);
  }

  if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.replace('/rest/v1/', '');
    const rows = state[table];
    if (!rows) return send(404, { message: `unknown table ${table}` });

    if (req.method === 'GET') {
      let result = applyOrder(rows.filter((r) => matches(r, url.searchParams)), url.searchParams);
      const limit = url.searchParams.get('limit');
      if (limit) result = result.slice(0, Number(limit));
      return send(200, maybeSingle(result));
    }

    if (req.method === 'POST') {
      const payload = await readBody(req);
      const items = Array.isArray(payload) ? payload : [payload];
      const created = items.map((item) => {
        const row = {
          id: uuid(),
          created_at: new Date().toISOString(),
          paid_at: null,
          paid_by: null,
          color: '#64748b',
          category_id: null,
          description: null,
          billing_month: null,
          ...item,
        };
        if (table === 'transactions') row.effective_month = computeEffectiveMonth(row);
        return row;
      });
      rows.push(...created);
      return send(201, maybeSingle(created));
    }

    if (req.method === 'PATCH') {
      const payload = await readBody(req);
      const updated = [];
      for (const row of rows) {
        if (matches(row, url.searchParams)) {
          Object.assign(row, payload);
          if (table === 'transactions') row.effective_month = computeEffectiveMonth(row);
          updated.push(row);
        }
      }
      return send(200, maybeSingle(updated));
    }

    if (req.method === 'DELETE') {
      state[table] = rows.filter((r) => !matches(r, url.searchParams));
      return send(200, []);
    }
  }

  send(404, { message: 'not found' });
});

const port = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);
server.listen(port, () => console.log(`fake supabase on http://127.0.0.1:${port}`));
