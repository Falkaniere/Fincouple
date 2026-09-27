/**
 * Service worker do Fincouple.
 *
 * Escopo de propósito modesto: o app é de dados ao vivo e compartilhados entre
 * dois celulares, então servir lançamentos velhos do cache seria pior do que
 * dizer "sem conexão". Aqui só cacheamos a casca do app (ícones e a página de
 * offline) para o atalho abrir instantâneo e não mostrar o dinossauro.
 *
 * Nada de dado do casal passa por este cache.
 */

const CACHE = 'fincouple-shell-v1';
const OFFLINE_URL = '/offline';

const SHELL = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `reload` evita gravar no cache uma resposta que já veio do cache HTTP.
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => {
        // Um recurso indisponível na instalação não pode derrubar o SW.
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Só mexemos no que é do próprio site.
  if (url.origin !== self.location.origin) return;

  // Chamadas de autenticação e dados nunca são cacheadas.
  if (url.pathname.startsWith('/auth')) return;

  // Navegação: rede primeiro; sem conexão, a página de offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached ?? Response.error();
      }),
    );
    return;
  }

  // Ícones: cache primeiro, porque não mudam.
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
