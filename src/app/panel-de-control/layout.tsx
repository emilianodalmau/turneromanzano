'use client';

import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import { Home, Settings, LogOut, User as UserIcon, CalendarDays, Ticket, ShieldCheck, Briefcase, Computer, MonitorPlay, Tv, Users } from 'lucide-react';
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
  const { user, profile, isUserLoading } = useUser();
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
  
  const userRole = profile?.role;

  const getTitleForPath = (path: string) => {
    if (path.includes('/mi-perfil')) return 'Mi Perfil';
    if (path.includes('/configuracion-de-agenda-licencias')) return 'Agenda Licencias';
    if (path.includes('/turnos-licencias')) return 'Gestión de Licencias';
    if (path.includes('/configuracion-de-agenda')) return 'Configuración de Agenda';
    if (path.includes('/configuracion')) return 'Configuración';
    if (path.includes('/turnos')) return 'Gestion de Turnos';
    if (path.includes('/atencion/areas')) return 'Gestión de Áreas';
    if (path.includes('/atencion/desks')) return 'Gestión de Escritorios';
    if (path.includes('/atencion/agente')) return 'Puesto de Atención';
    if (path.includes('/atencion/pantalla')) return 'Pantalla de Turnos';
    if (path.includes('/administracion-de-usuarios')) return 'Administración de Usuarios';
    return 'Panel de Control';
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <div className="flex flex-col h-full pt-16">
          <SidebarMenu className="flex-1 p-2">
            <SidebarMenuItem>
              <Link href="/panel-de-control">
                <SidebarMenuButton asChild tooltip="Inicio" isActive={pathname === '/panel-de-control'}>
                  <span>
                    <Home />
                    <span>Inicio</span>
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            {(userRole === 'manzano_admin' || userRole === 'super_admin') && (
              <>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/configuracion-de-agenda">
                    <SidebarMenuButton asChild tooltip="Agenda Museo" isActive={pathname.startsWith('/panel-de-control/configuracion-de-agenda')}>
                      <span>
                        <CalendarDays />
                        <span>Agenda Museo</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/turnos">
                    <SidebarMenuButton asChild tooltip="Turnos Museo" isActive={pathname.startsWith('/panel-de-control/turnos')}>
                      <span>
                        <Ticket />
                        <span>Turnos Museo</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </>
            )}

            {(userRole === 'license_admin' || userRole === 'super_admin') && (
               <>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/configuracion-de-agenda-licencias">
                    <SidebarMenuButton asChild tooltip="Agenda Licencias" isActive={pathname.startsWith('/panel-de-control/configuracion-de-agenda-licencias')}>
                      <span>
                        <CalendarDays />
                        <span>Agenda Licencias</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/turnos-licencias">
                    <SidebarMenuButton asChild tooltip="Turnos Licencias" isActive={pathname.startsWith('/panel-de-control/turnos-licencias')}>
                      <span>
                        <ShieldCheck />
                        <span>Turnos Licencias</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </>
            )}
            
            {userRole === 'super_admin' && (
              <>
               <SidebarMenuItem>
                  <Link href="/panel-de-control/atencion/agente">
                    <SidebarMenuButton asChild tooltip="Puesto de Atención" isActive={pathname.startsWith('/panel-de-control/atencion/agente')}>
                      <span>
                        <MonitorPlay />
                        <span>Puesto de Atención</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/atencion/areas">
                    <SidebarMenuButton asChild tooltip="Áreas de Atención" isActive={pathname.startsWith('/panel-de-control/atencion/areas')}>
                      <span>
                        <Briefcase />
                        <span>Áreas de Atención</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/atencion/desks">
                    <SidebarMenuButton asChild tooltip="Gestión de Escritorios" isActive={pathname.startsWith('/panel-de-control/atencion/desks')}>
                      <span>
                        <Computer />
                        <span>Gestión de Escritorios</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <Link href="/pantalla" target="_blank">
                    <SidebarMenuButton asChild tooltip="Ver Pantalla Pública">
                      <span>
                        <Tv />
                        <span>Pantalla Pública</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/administracion-de-usuarios">
                    <SidebarMenuButton asChild tooltip="Administrar Usuarios" isActive={pathname.startsWith('/panel-de-control/administracion-de-usuarios')}>
                      <span>
                        <Users />
                        <span>Administrar Usuarios</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/panel-de-control/configuracion">
                    <SidebarMenuButton asChild tooltip="Configuración" isActive={pathname.startsWith('/panel-de-control/configuracion')}>
                      <span>
                        <Settings />
                        <span>Configuración</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </>
            )}

             <SidebarMenuItem>
                <Link href="/panel-de-control/mi-perfil">
                  <SidebarMenuButton asChild tooltip="Mi Perfil" isActive={pathname === '/panel-de-control/mi-perfil'}>
                    <span>
                      <UserIcon />
                      <span>Mi Perfil</span>
                    </span>
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
