'use client';

import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import { Home, Settings, LogOut, User as UserIcon, CalendarDays } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function PanelDeControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  const getTitleForPath = (path: string) => {
    if (path.includes('/configuracion-de-agenda')) return 'Configuración de Agenda';
    if (path.includes('/configuracion')) return 'Configuración';
    return 'Panel de Control';
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-sidebar-primary-foreground">Mi App</h2>
          </div>
          <SidebarMenu className="flex-1 p-2">
            <SidebarMenuItem>
              <Link href="/panel-de-control" passHref legacyBehavior>
                <SidebarMenuButton asChild tooltip="Inicio" isActive={pathname === '/panel-de-control'}>
                  <a>
                    <Home />
                    <span>Inicio</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
               <Link href="/panel-de-control/configuracion-de-agenda" passHref legacyBehavior>
                <SidebarMenuButton asChild tooltip="Configuración de Agenda" isActive={pathname.startsWith('/panel-de-control/configuracion-de-agenda')}>
                  <a>
                    <CalendarDays />
                    <span>Agenda</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <Link href="/panel-de-control/configuracion" passHref legacyBehavior>
                <SidebarMenuButton asChild tooltip="Configuración" isActive={pathname.startsWith('/panel-de-control/configuracion')}>
                  <a>
                    <Settings />
                    <span>Configuración</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="p-2 border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                     <AvatarFallback>
                        <UserIcon />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-sidebar-foreground truncate">{user.email}</span>
                  </div>
                </div>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton onClick={() => signOut(auth)} tooltip="Cerrar Sesión">
                    <LogOut />
                    <span>Cerrar Sesión</span>
                </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">{getTitleForPath(pathname)}</h1>
        </header>
        <main className="p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
