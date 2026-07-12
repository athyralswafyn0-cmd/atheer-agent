import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'AI Customer Assistant Platform',
  description: 'منصة المساعد الذكي للعملاء - إدارة محادثات، جمع بيانات، تحليلات',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}