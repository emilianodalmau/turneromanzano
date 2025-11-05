"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { CalendarDays, Settings, Sparkles, Home, LogOut } from "lucide-react";
import Logo from "../Logo";
import Link from "next/link";
import { useAuth } from "@/firebase";

const menuItems = [
  {
    href: "/admin/appointments",
    icon: CalendarDays,
    label: "Turnos",
    tooltip: "Gestionar Turnos",
  },
  {
    href: "/admin/schedule",
    icon: Settings,
    label: "Configuración",
    tooltip: "Configurar Horarios",
  },
  {
    href: "/admin/optimize",
    icon: Sparkles,
    label: "Optimizar",
    tooltip: "Optimización IA",
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin');
  };

  return (
    <>
      <SidebarHeader>
        <Logo isLink={false} className="text-sidebar-foreground" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.tooltip }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarSeparator />
           <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={{ children: 'Sitio Público' }}>
                <Link href="/">
                  <Home />
                  <span>Sitio Público</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip={{ children: 'Cerrar Sesión' }}>
                <LogOut />
                <span>Cerrar Sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
