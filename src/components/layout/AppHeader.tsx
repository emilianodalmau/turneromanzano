'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AppConfiguration } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function AppHeader() {
    const pathname = usePathname();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const logoWidth = 133;
    const logoHeight = 50;
    
    const configRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'appConfiguration', 'main') : null),
        [firestore]
    );

    const { data: appConfig, isLoading } = useDoc<AppConfiguration>(configRef);

    const defaultLogoUrl = "https://www.tunuyan.gov.ar/site/wp-content/uploads/2025/06/logo_tunuyan_ciudad_del_agua.png";
    const logoUrl = appConfig?.logoUrl || defaultLogoUrl;

    // Don't show login button on login page.
    const showLoginButton = !isUserLoading && !user && pathname !== '/login';

    return (
        <header className="fixed top-0 left-0 right-0 bg-background z-50 border-b">
            <div className="container mx-auto flex items-center justify-between h-20 px-4">
                <Link href="/" passHref>
                    {isLoading ? (
                        <Skeleton style={{ width: logoWidth, height: logoHeight }} />
                    ) : (
                        <Image
                            src={logoUrl}
                            alt="Logo Municipalidad de Tunuyán"
                            width={logoWidth}
                            height={logoHeight}
                            style={{ objectFit: 'contain' }}
                            priority
                        />
                    )}
                </Link>
                {showLoginButton && (
                     <Link href="/login" passHref>
                       <Button variant="ghost">Iniciar Sesión</Button>
                    </Link>
                )}
            </div>
        </header>
    );
}
