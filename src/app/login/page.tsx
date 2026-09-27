import { Suspense } from 'react';

import { LoginForm } from '@/components/login-form';
import { Spinner } from '@/components/ui';

export const metadata = { title: 'Entrar · Fincouple' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Suspense fallback={<div className="flex justify-center"><Spinner /></div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
