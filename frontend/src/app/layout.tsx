import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { AppShell } from '../components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Customer Loyalty and Engagement Assistant',
  description: 'Enterprise GenAI Customer Engagement Platform for Retail and Telecom Organizations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
