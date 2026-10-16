const TOUR_SEEN_KEY = 'pairly:tour-seen';

/** Só o navegador sabe se a pessoa já viu o tour. Sem armazenamento, ele aparece de novo. */
export function wasTourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, '1');
  } catch {
    // Navegação privada: o tour volta na próxima visita. Tudo bem.
  }
}
