'use client';

import { useEffect } from 'react';

/** Registra o service worker depois que a página já carregou. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Em desenvolvimento o SW só atrapalha o hot reload.
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Sem service worker o app funciona igual; só não abre offline.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
