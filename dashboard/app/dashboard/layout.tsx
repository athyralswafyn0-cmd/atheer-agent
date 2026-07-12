'use client';

import { AuthProvider } from '@/lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="p-4">{children}</div>
    </AuthProvider>
  );
}
