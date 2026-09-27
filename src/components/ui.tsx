'use client';

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

import { SpinnerIcon } from './icons';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong disabled:opacity-50',
  secondary:
    'bg-surface-2 text-text border border-border hover:bg-border/60 disabled:opacity-50',
  ghost: 'text-muted hover:bg-surface-2 disabled:opacity-50',
  danger: 'bg-negative-soft text-negative hover:brightness-95 disabled:opacity-50',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        size === 'lg' ? 'min-h-13 px-5 text-base' : 'min-h-11 px-4 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <SpinnerIcon className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        'w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text',
        'placeholder:text-muted/70',
        'focus:border-brand focus:outline-2 focus:outline-offset-0 focus:outline-brand/40',
        className,
      )}
    />
  );
}

/** Aviso curto de erro ou sucesso, sempre lido por leitor de tela. */
export function Notice({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const tones = {
    error: 'bg-negative-soft text-negative',
    success: 'bg-positive-soft text-positive',
    info: 'bg-brand-soft text-brand-strong',
  } as const;
  return (
    <p role="status" className={cx('rounded-xl px-3.5 py-2.5 text-sm', tones[tone])}>
      {children}
    </p>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="Carregando">
      <SpinnerIcon className={cx('size-5 animate-spin text-muted', className)} />
    </span>
  );
}

/** Estado vazio com um texto acolhedor em vez de uma lista em branco. */
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-semibold text-text">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">{children}</p>}
    </div>
  );
}
