export const metadata = { title: 'Sem conexão · Fincouple' };

/** Mostrada pelo service worker quando o celular está sem internet. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-8 text-center">
      <h1 className="text-xl font-bold">Sem conexão</h1>
      <p className="text-muted">
        O Fincouple precisa de internet para manter os lançamentos iguais nos dois celulares.
      </p>
      <p className="mt-2 text-sm text-muted">Assim que a conexão voltar, é só recarregar.</p>
    </main>
  );
}
