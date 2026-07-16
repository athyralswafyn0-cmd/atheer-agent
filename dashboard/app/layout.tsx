import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces, Tajawal } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const tajawal = Tajawal({
  subsets: ['arabic'],
  variable: '--font-tajawal',
  display: 'swap',
  weight: ['300', '400', '500', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Atheer Agent AI | منصة الوكلاء الذكية الرائدة',
  description: 'منصة Atheer Agent AI - ابنِ وكلاء ذكية، أتمت العمليات، وحقّق النمو. منصة الوكلاء الذكية الأولى في المنطقة.',
  keywords: ['AI Agents', 'Automation', 'Chatbot', 'Business Intelligence', 'Atheer', 'ذكاء اصطناعي', 'أتمتة', 'وكلاء ذكية'],
  authors: [{ name: 'Atheer Agent AI' }],
  creator: 'Atheer Agent AI',
  publisher: 'Atheer Agent AI',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: 'https://atheer-agent.ai',
    siteName: 'Atheer Agent AI',
    title: 'Atheer Agent AI | منصة الوكلاء الذكية الرائدة',
    description: 'منصة Atheer Agent AI - ابنِ وكلاء ذكية، أتمت العمليات، وحقّق النمو.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Atheer Agent AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atheer Agent AI',
    description: 'منصة الوكلاء الذكية الرائدة',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: '#05030B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontClass = `${inter.variable} ${fraunces.variable} ${tajawal.variable}`;

  return (
    <html lang="ar" dir="rtl" className={`${fontClass} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className={`${inter.className} ${fraunces.className} ${tajawal.className} font-arabic bg-space text-ink overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}