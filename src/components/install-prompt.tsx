'use client';

import { useState, useSyncExternalStore } from 'react';

import {
  clearInstallState,
  getInstallState,
  getServerInstallState,
  subscribeInstall,
} from '@/lib/install-store';
import { Button } from './ui';
import { CloseIcon, ShareIcon } from './icons';

const DISMISS_KEY = 'fincouple:install-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    // Navegação privada ou armazenamento bloqueado: o convite volta depois.
    return false;
  }
}

/**
 * Convite para adicionar à tela inicial, mostrado depois do login.
 *
 * No Android/Chrome o botão realmente instala. No iPhone não existe API de
 * instalação — nenhum site consegue instalar por botão lá — então mostramos a
 * instrução do menu Compartilhar.
 */
export function InstallPrompt() {
  const install = useSyncExternalStore(
    subscribeInstall,
    getInstallState,
    getServerInstallState,
  );
  const [dismissed, setDismissed] = useState(false);

  if (install.kind === 'none' || dismissed) return null;
  // Só consultamos o localStorage no cliente, depois do primeiro render.
  if (wasDismissed()) return null;

  const isIOS = install.kind === 'ios';

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sem armazenamento o convite volta na próxima visita. Tudo bem.
    }
  }

  async function handleInstall() {
    const event = install.event;
    if (!event) return;

    await event.prompt();
    const { outcome } = await event.userChoice;

    if (outcome === 'accepted') dismiss();
    // Recusou: some por esta sessão, mas volta numa próxima visita.
    else clearInstallState();
  }

  return (
    <div
      role="dialog"
      aria-label="Adicionar à tela inicial"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 animate-fade-in"
    >
      <div className="card mx-auto max-w-lg p-4 shadow-lg shadow-black/15">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
            <ShareIcon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold">Adicione à tela inicial</p>
            <p className="mt-0.5 text-sm text-muted">
              {isIOS
                ? 'Toque em Compartilhar, na barra do Safari, e escolha "Adicionar à Tela de Início".'
                : 'Fica com ícone próprio e abre como um aplicativo.'}
            </p>

            {!isIOS && (
              <Button className="mt-3 w-full" onClick={() => void handleInstall()}>
                Adicionar
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Agora não"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
