'use client';

import { useEffect, useRef } from 'react';

import { CloseIcon } from './icons';

/**
 * Folha que sobe de baixo. Usa <dialog> nativo para ganhar foco preso,
 * fechamento com Esc e o backdrop de graça.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        // Esc: fechamos pelo React para o estado não sair de sincronia.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clique fora do conteúdo (no backdrop) fecha.
        if (event.target === ref.current) onClose();
      }}
      className={
        'fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 ' +
        'backdrop:bg-[var(--overlay)] backdrop:animate-fade-in'
      }
    >
      <div className="flex h-full items-end justify-center">
        <div className="animate-sheet-up max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] text-text">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-2"
            >
              <CloseIcon className="size-5" />
            </button>
          </header>

          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </dialog>
  );
}
