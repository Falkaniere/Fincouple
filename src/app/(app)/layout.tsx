import { AppShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
