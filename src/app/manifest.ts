import type { MetadataRoute } from 'next';

/** Servido em /manifest.webmanifest — é o que permite instalar na tela inicial. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fincouple — controle do casal',
    short_name: 'Fincouple',
    description: 'Controle financeiro compartilhado para casais.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f7f9',
    theme_color: '#0d9488',
    lang: 'pt-BR',
    dir: 'ltr',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // O ícone "maskable" é o que o Android recorta em círculo sem cortar o desenho.
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Contas a pagar', url: '/contas' },
      { name: 'Ajustes', url: '/ajustes' },
    ],
  };
}
