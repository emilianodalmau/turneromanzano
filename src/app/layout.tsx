import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aplicación Firebase',
  description: 'Un nuevo comienzo',
};

function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 p-4 bg-background z-50">
            <Link href="/" passHref>
                <Image
                    src="https://www.tunuyan.gov.ar/site/wp-content/uploads/2025/06/logo_tunuyan_ciudad_del_agua.png"
                    alt="Logo Municipalidad de Tunuyán"
                    width={133}
                    height={50}
                    priority
                />
            </Link>
        </header>
    );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <FirebaseClientProvider>
          <Header />
          <main className="flex-grow pt-24">
            {children}
          </main>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
