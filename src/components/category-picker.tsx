'use client';

import { useState } from 'react';

import { useCreateCategory } from '@/hooks/use-month-data';
import type { Category, Kind } from '@/lib/types';
import { Button, Input, Notice, cx } from './ui';
import { PlusIcon } from './icons';

/** Paleta oferecida às categorias novas, na ordem de uso. */
const PALETTE = [
  '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
  '#14b8a6', '#6366f1', '#ec4899', '#84cc16', '#f97316',
];

/**
 * Chips de categoria com o chip "+ Nova". Criar aqui salva a categoria no
 * casal, já a deixa selecionada e ela passa a aparecer nos próximos lançamentos.
 */
export function CategoryPicker({
  coupleId,
  categories,
  kind,
  value,
  onChange,
}: {
  coupleId: string;
  categories: Category[];
  kind: Kind;
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const createCategory = useCreateCategory(coupleId);

  const options = categories.filter((c) => c.kind === kind);

  // Cor ainda não usada, para as categorias não ficarem todas iguais.
  const nextColor =
    PALETTE.find((color) => !categories.some((c) => c.color === color)) ??
    PALETTE[categories.length % PALETTE.length];

  const duplicated = options.some(
    (c) => c.name.trim().toLowerCase() === newName.trim().toLowerCase(),
  );

  function submitNew() {
    const name = newName.trim();
    if (!name || duplicated) return;

    createCategory.mutate(
      { name, kind, color: nextColor },
      {
        onSuccess: (category) => {
          onChange(category.id);
          setNewName('');
          setCreating(false);
        },
      },
    );
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-muted">Categoria</span>

      <div className="flex flex-wrap gap-2">
        {options.map((category) => {
          const selected = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : category.id)}
              className={cx(
                'inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium',
                selected
                  ? 'border-brand bg-brand-soft text-brand-strong'
                  : 'border-border bg-surface text-text',
              )}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ background: category.color }}
              />
              {category.name}
            </button>
          );
        })}

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-brand px-3.5 text-sm font-semibold text-brand"
          >
            <PlusIcon className="size-4" />
            Nova
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da categoria"
              maxLength={40}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitNew();
                }
              }}
            />
            <Button
              type="button"
              onClick={submitNew}
              loading={createCategory.isPending}
              disabled={!newName.trim() || duplicated}
            >
              Criar
            </Button>
          </div>

          {duplicated && (
            <p className="mt-2 text-xs text-warning">Vocês já têm uma categoria com esse nome.</p>
          )}
          {createCategory.isError && !duplicated && (
            <div className="mt-2">
              <Notice>Não deu para criar a categoria. Tente de novo.</Notice>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewName('');
            }}
            className="mt-2 text-xs font-medium text-muted underline"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
