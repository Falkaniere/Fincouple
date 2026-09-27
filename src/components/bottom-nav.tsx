'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BillIcon, HomeIcon, SettingsIcon } from './icons';
import { cx } from './ui';

const TABS = [
  { href: '/', label: 'Início', Icon: HomeIcon },
  { href: '/contas', label: 'Contas', Icon: BillIcon },
  { href: '/ajustes', label: 'Ajustes', Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      // pb com safe-area para a barra não ficar embaixo do gesto do iPhone.
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  active ? 'text-brand' : 'text-muted',
                )}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
