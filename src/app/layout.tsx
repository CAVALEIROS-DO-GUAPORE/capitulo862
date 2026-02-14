import type { Metadata, Viewport } from "next";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
const logoUrl = `${siteUrl}/logocapitulo.png`;

export const metadata: Metadata = {
  title: "Cavaleiros do Guaporé nº 862 | Ordem DeMolay",
  description: "Site oficial do Capítulo DeMolay Cavaleiros do Guaporé número 862 - Fraternidade, Reverência e Companheirismo",
  manifest: "/manifest.json",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Cavaleiros do Guaporé nº 862 | Ordem DeMolay",
    description: "Site oficial do Capítulo DeMolay Cavaleiros do Guaporé número 862",
    url: siteUrl,
    siteName: "Cavaleiros do Guaporé nº 862",
    images: [{ url: logoUrl, width: 512, height: 512, alt: "Cap. Cavaleiros do Guaporé nº 862" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cavaleiros do Guaporé nº 862 | Ordem DeMolay",
    images: [logoUrl],
  },
  icons: {
    icon: [{ url: "/logocapitulo.ico", type: "image/x-icon", sizes: "any" }],
    apple: [{ url: "/logocapitulo.ico", type: "image/x-icon", sizes: "any" }],
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
        <link rel="icon" href="/logocapitulo.ico" type="image/x-icon" sizes="any" />
        <link rel="apple-touch-icon" href="/logocapitulo.ico" />
        <meta property="og:image" content={logoUrl} />
        <meta property="og:image:url" content={logoUrl} />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-sans">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
