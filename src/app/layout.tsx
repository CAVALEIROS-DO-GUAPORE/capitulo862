import type { Metadata, Viewport } from "next";
import { Crimson_Text, Lato } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";

const crimson = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Cavaleiros do Guaporé nº 862 | Ordem DeMolay",
  description: "Site oficial do Capítulo DeMolay Cavaleiros do Guaporé número 862 - Fraternidade, Reverência e Companheirismo",
  manifest: "/manifest.json",
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
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${crimson.variable} ${lato.variable} antialiased min-h-screen flex flex-col`}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
