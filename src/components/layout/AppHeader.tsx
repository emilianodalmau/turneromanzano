'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppHeader() {
    const pathname = usePathname();
    const isHomePage = pathname === '/';

    const logoWidth = isHomePage ? 133 : 67;
    const logoHeight = isHomePage ? 50 : 25;

    return (
        <header className="fixed top-0 left-0 right-0 p-4 bg-background z-50">
            <Link href="/" passHref>
                <Image
                    src="https://www.tunuyan.gov.ar/site/wp-content/uploads/2025/06/logo_tunuyan_ciudad_del_agua.png"
                    alt="Logo Municipalidad de Tunuyán"
                    width={logoWidth}
                    height={logoHeight}
                    priority
                />
            </Link>
        </header>
    );
}
