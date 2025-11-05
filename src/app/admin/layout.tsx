
'use client';

import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import AdminNav from "@/components/admin/AdminNav";
import { useUser } from "@/firebase";
import AdminLogin from "@/components/admin/AdminLogin";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AdminNav />
      </Sidebar>
      <SidebarInset>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
