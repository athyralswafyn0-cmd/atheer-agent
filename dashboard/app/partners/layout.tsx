'use client';

import { AuthProvider } from '@/lib/auth';

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}