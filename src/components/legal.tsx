import Link from 'next/link';

/** Contato para pedidos de dados e dúvidas (também exigido pela LGPD). */
export const LEGAL_CONTACT = 'jfsdever@gmail.com';

/** Casca das páginas de Termos e Privacidade: texto corrido, sem JavaScript no navegador. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8 pb-16">
      <Link href="/login" className="text-sm font-medium text-brand">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">Última atualização: {updated}</p>
      <div className="mt-6 space-y-4 leading-relaxed">{children}</div>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-xl font-semibold">{children}</h2>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}
