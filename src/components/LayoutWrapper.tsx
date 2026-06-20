'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import DialogsProvider from './DialogsProvider';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPainel = pathname?.startsWith('/painel');
  const isManutencao = pathname === '/manutencao';

  return (
    <DialogsProvider>
      {!isPainel && !isManutencao && <Header />}
      <main className="flex-1">{children}</main>
      {!isPainel && !isManutencao && <Footer />}
    </DialogsProvider>
  );
}
