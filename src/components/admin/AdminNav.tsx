"use client";

import { usePathname } from "next/navigation";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { CalendarDays, Settings, Sparkles, Home } from "lucide-react";
import Logo from "../Logo";
import Link from "next/link";

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

  return (
    <>
      <SidebarHeader>
        <Logo isLink={false} className="text-sidebar-foreground" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={{ children: item.tooltip }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <SidebarSeparator />
           <SidebarMenuItem>
              <Link href="/" passHref legacyBehavior>
                <SidebarMenuButton tooltip={{ children: 'Sitio Público' }}>
                  <Home />
                  <span>Sitio Público</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
