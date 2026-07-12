'use client';

import { AuthProvider } from '@/lib/auth';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="p-4">{children}</div>
    </AuthProvider>
  );
}