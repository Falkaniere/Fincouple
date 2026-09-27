import { OnboardingFlow } from '@/components/onboarding-flow';
import { Providers } from '@/components/providers';

export const metadata = { title: 'Começar · Fincouple' };

export default function OnboardingPage() {
  return (
    // O onboarding fica fora do grupo (app) — ainda não há casal para o
    // AppShell carregar — então traz o seu próprio provider de dados.
    <Providers>
      <main className="mx-auto min-h-dvh max-w-md px-6 py-10">
        <OnboardingFlow />
      </main>
    </Providers>
  );
}
