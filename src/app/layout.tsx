import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { ServiceWorkerRegistrar } from '@/components/service-worker';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fincouple',
  description: 'Controle financeiro compartilhado para casais.',
  applicationName: 'Fincouple',
  appleWebApp: {
    capable: true,
    title: 'Fincouple',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // O zoom por pinça fica liberado de propósito: travá-lo atrapalha quem
  // precisa ampliar. O zoom automático do iOS já é evitado pelos inputs de 16px.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1014' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
