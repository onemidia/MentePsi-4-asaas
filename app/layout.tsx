'use client' // Transformamos em client para o AppShell funcionar corretamente

import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // ADICIONADO: Rotas limpas sem Sidebar (incluindo rotas dinâmicas com startsWith)
  const isFullWidthPage = 
    pathname === "/" || 
    pathname === "/login" || 
    pathname === "/planos" || 
    pathname === "/registro" || 
    pathname === "/hub" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/checkout" ||
    (pathname?.startsWith("/portal/") && pathname !== "/portal") ||
    pathname?.startsWith("/callback");

  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.className} antialiased bg-white`}>
        {isFullWidthPage ? (
          // Se for página pública, renderiza limpo (sem Sidebar)
          <main className="w-full min-h-screen bg-white">{children}</main>
        ) : (
          // Se for área logada, usa o AppShell com o menu lateral
          <AppShell>{children}</AppShell>
        )}
      </body>
    </html>
  );
}