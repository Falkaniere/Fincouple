'use client';

import { useEffect, useRef } from 'react';

import { CloseIcon } from './icons';
import { cx } from './ui';

/**
 * Folha que sobe de baixo. Usa <dialog> nativo para ganhar foco preso,
 * fechamento com Esc e o backdrop de graça.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Ações fixas embaixo da folha (o botão de salvar, apagar etc). Ficam fora
   * da área que rola, então nunca saem da tela com o teclado aberto -- só o
   * conteúdo do meio rola, não a folha inteira. Sem isso, num formulário
   * comprido o botão podia acabar logo abaixo da borda visível quando o
   * teclado encolhia a tela, e o toque não pegava nele.
   */
  footer?: React.ReactNode;
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
        <div className="animate-sheet-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface text-text">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4">
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

          {/* Só esta área rola. Header e footer ficam sempre visíveis,
              mesmo quando o teclado encolhe o espaço disponível. */}
          <div
            className={cx(
              'overflow-y-auto px-5 py-4',
              footer ? '' : 'pb-[max(1rem,env(safe-area-inset-bottom))]',
            )}
          >
            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t border-border bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
