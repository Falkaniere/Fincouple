'use client';

import { useState } from 'react';

import { markTourSeen } from '@/lib/tour-store';
import { BillIcon, CloseIcon, RepeatIcon, ShareIcon, SheetIcon, UploadIcon } from './icons';
import { Button, cx } from './ui';

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;

const SLIDES: Array<{ icon: IconComponent; title: string; body: string }> = [
  {
    icon: SheetIcon,
    title: 'Compras parceladas',
    body: 'Diga o valor de cada parcela e quantas são: o Pairly lança uma por mês, sem dividir nem arredondar nada. Já vinha pagando? Escolha em que parcela você está.',
  },
  {
    icon: BillIcon,
    title: 'Mês da fatura',
    body: 'Gasto no cartão de crédito? Escolha em que mês ele deve contar. Cada cartão fecha num dia diferente, então a decisão é sua.',
  },
  {
    icon: RepeatIcon,
    title: 'Contas que se repetem',
    body: 'Aluguel, assinatura, internet: marque como recorrente uma vez e a conta volta sozinha no mês seguinte, depois que você der o check.',
  },
  {
    icon: UploadIcon,
    title: 'Importe a fatura inteira',
    body: 'Tem muita coisa para lançar? Importe o extrato em .csv, .xlsx ou .pdf. O Pairly sugere as categorias e você confere tudo antes de confirmar.',
  },
  {
    icon: ShareIcon,
    title: 'Instale no celular',
    body: 'iPhone: toque em Compartilhar, no Safari, e escolha "Adicionar à Tela de Início". Android: abra o menu do Chrome (⋮) e toque em "Instalar app". Fica com ícone próprio e abre como um aplicativo.',
  },
];

/**
 * Tour rápido de funcionalidades, em tela cheia. Nunca bloqueia: dá para pular
 * em qualquer slide, e dá para rever depois em Ajustes.
 */
export function FeatureTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  function finish() {
    markTourSeen();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tour do Pairly"
      className="fixed inset-0 z-50 flex flex-col bg-surface text-text animate-fade-in"
    >
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={finish}
          className="min-h-11 text-sm font-medium text-muted hover:text-text"
        >
          Pular
        </button>
        <button
          type="button"
          onClick={finish}
          aria-label="Fechar o tour"
          className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-brand-soft text-brand-strong">
          <Icon className="size-9" />
        </div>
        <h2 className="mt-8 text-2xl font-bold">{slide.title}</h2>
        <p className="mt-3 leading-relaxed text-muted">{slide.body}</p>
      </div>

      <div className="mx-auto w-full max-w-md px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {SLIDES.map((_, index) => (
            <span
              key={index}
              className={cx(
                'h-2 rounded-full transition-all',
                index === step ? 'w-6 bg-brand' : 'w-2 bg-border',
              )}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={last ? finish : () => setStep(step + 1)}>
            {last ? 'Começar' : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
