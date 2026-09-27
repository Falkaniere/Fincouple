'use client';

import { useState } from 'react';

import type { Couple } from '@/lib/types';
import { Button } from './ui';
import { CopyIcon, ShareIcon } from './icons';

/**
 * Cartão do código do convite. Fica no onboarding e em Ajustes, porque perder
 * o código é a única forma de o casal ficar sem acesso ao controle.
 */
export function InviteCodeCard({ couple }: { couple: Couple }) {
  const [copied, setCopied] = useState(false);

  const message =
    `Entrei no Fincouple pra gente controlar nossos gastos juntos. ` +
    `Abra ${siteUrl()} e use o código ${couple.invite_code}.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(couple.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o código está na tela, dá para
      // selecionar à mão.
      setCopied(false);
    }
  }

  async function share() {
    // navigator.share é o caminho nativo no celular; no desktop cai no WhatsApp Web.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Fincouple', text: message });
        return;
      } catch {
        // Compartilhamento cancelado pela pessoa: não é erro.
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-brand-soft px-5 py-6 text-center">
        <p className="text-sm font-medium text-brand-strong">Código do casal</p>
        <p className="mt-1.5 font-mono text-4xl font-bold tracking-[0.25em] text-brand-strong">
          {couple.invite_code}
        </p>
      </div>

      <div className="flex gap-2 p-3">
        <Button variant="secondary" className="flex-1" onClick={copy}>
          <CopyIcon className="size-4" />
          {copied ? 'Copiado!' : 'Copiar'}
        </Button>
        <Button className="flex-1" onClick={share}>
          <ShareIcon className="size-4" />
          Compartilhar
        </Button>
      </div>

      <p className="border-t border-border px-4 py-3 text-xs text-muted">
        Guarde este código. Quem tiver ele e um email de acesso entra no controle de vocês.
      </p>
    </div>
  );
}

function siteUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://fincouple.vercel.app';
}
