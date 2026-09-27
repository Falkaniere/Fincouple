/**
 * Estado de "dá para instalar este app" como uma fonte externa, lida com
 * `useSyncExternalStore`. O evento `beforeinstallprompt` do Chrome pode
 * disparar antes do React montar, então quem escuta primeiro é este módulo,
 * não um componente.
 */

/** Evento do Chrome que permite instalar por botão. Não está no lib.dom. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** 'none' = nada a oferecer, 'prompt' = dá para instalar por botão, 'ios' = instrução manual. */
  kind: 'none' | 'prompt' | 'ios';
  event: BeforeInstallPromptEvent | null;
}

const NONE: InstallState = { kind: 'none', event: null };

let state: InstallState = NONE;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: InstallState) {
  state = next;
  emit();
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS antigo expõe isso em vez do display-mode.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function start() {
  if (started) return;
  started = true;

  // Já instalado: não há o que oferecer.
  if (isStandalone()) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Sem preventDefault o Chrome mostra o próprio banner e o evento se perde.
    event.preventDefault();
    setState({ kind: 'prompt', event: event as BeforeInstallPromptEvent });
  });

  window.addEventListener('appinstalled', () => setState(NONE));

  // No iOS o evento nunca dispara: não existe API de instalação lá, só o
  // menu Compartilhar. Marcamos para mostrar a instrução.
  if (/iPad|iPhone|iPod/.test(window.navigator.userAgent)) {
    setState({ kind: 'ios', event: null });
  }
}

export function subscribeInstall(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallState(): InstallState {
  return state;
}

/** No servidor não há nada a oferecer — evita divergência na hidratação. */
export function getServerInstallState(): InstallState {
  return NONE;
}

export function clearInstallState() {
  setState(NONE);
}
