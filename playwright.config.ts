import { existsSync } from 'node:fs';

import { defineConfig } from '@playwright/test';

const FAKE_SUPABASE = 'http://127.0.0.1:54321';

/**
 * Alguns ambientes já trazem o Chromium num caminho fixo (é o caso dos
 * contêineres com PLAYWRIGHT_BROWSERS_PATH). Se houver um, usamos; senão
 * deixamos o Playwright escolher o que ele instalou.
 */
function chromiumPath(): string | undefined {
  const candidates = [
    process.env.CHROMIUM_PATH,
    process.env.PLAYWRIGHT_BROWSERS_PATH
      ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium`
      : undefined,
  ].filter((p): p is string => Boolean(p));

  return candidates.find((p) => existsSync(p));
}

/**
 * Roda o app de produção contra o Supabase falso (e2e/fake-supabase-server.mjs).
 * Veja o cabeçalho daquele arquivo para o que estes testes cobrem e o que não.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: { executablePath: chromiumPath() },
    // Tamanho de celular: é onde o app vai ser usado.
    viewport: { width: 390, height: 844 },
    trace: 'off',
  },
  webServer: [
    {
      command: 'node e2e/fake-supabase-server.mjs',
      url: `${FAKE_SUPABASE}/auth/v1/settings`,
      reuseExistingServer: true,
      stdout: 'ignore',
    },
    {
      command: 'npm run build && npx next start --port 3100',
      url: 'http://127.0.0.1:3100/login',
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'ignore',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon-key',
      },
    },
  ],
});
