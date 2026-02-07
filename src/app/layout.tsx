import type { Metadata, Viewport } from "next";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

export const metadata: Metadata = {
  title: "Cavaleiros do Guaporé nº 862 | Ordem DeMolay",
  description: "Site oficial do Capítulo DeMolay Cavaleiros do Guaporé número 862 - Fraternidade, Reverência e Companheirismo",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  openGraph: {
    title: "Cavaleiros do Guaporé nº 862 | Ordem DeMolay",
    description: "Site oficial do Capítulo DeMolay Cavaleiros do Guaporé número 862",
    images: ['/logocapitulo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Cavaleiros do Guaporé nº 862 | Ordem DeMolay",
    images: ['/logocapitulo.png'],
  },
  icons: {
    icon: '/logocapitulo.png',
    apple: '/logocapitulo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cav. Guaporé 862",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/logocapitulo.png" />
        <link rel="apple-touch-icon" href="/logocapitulo.png" />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-sans">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
