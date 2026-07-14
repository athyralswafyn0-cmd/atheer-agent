'use client';

import { AuthProvider } from '@/lib/auth';
import { initializeAuth } from '@/lib/api';
import { useEffect } from 'react';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <AuthProvider>
      <div className="p-4">{children}</div>
    </AuthProvider>
  );
}