'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AppConfiguration } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function AppHeader() {
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const firestore = useFirestore();

    const logoWidth = isHomePage ? 133 : 67;
    const logoHeight = isHomePage ? 50 : 25;
    
    const configRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'appConfiguration', 'main') : null),
        [firestore]
    );

    const { data: appConfig, isLoading } = useDoc<AppConfiguration>(configRef);

    const defaultLogoUrl = "https://www.tunuyan.gov.ar/site/wp-content/uploads/2025/06/logo_tunuyan_ciudad_del_agua.png";
    const logoUrl = appConfig?.logoUrl || defaultLogoUrl;

    return (
        <header className="fixed top-0 left-0 right-0 p-4 bg-background z-50">
            <Link href="/" passHref>
                {isLoading ? (
                    <Skeleton style={{ width: logoWidth, height: logoHeight }} />
                ) : (
                    <Image
                        src={logoUrl}
                        alt="Logo Municipalidad de Tunuyán"
                        width={logoWidth}
                        height={logoHeight}
                        priority
                    />
                )}
            </Link>
        </header>
    );
}
