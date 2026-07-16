'use client';

import { AuthProvider } from '@/lib/auth';

export default function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}