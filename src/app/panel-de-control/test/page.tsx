'use client';

import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function TestPage() {
  const { profile, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (profile?.role !== 'manzano_admin' && profile?.role !== 'super_admin') {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Acceso Denegado</h1>
        <p>No tienes los permisos necesarios para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Página de prueba vacía */}
    </div>
  );
}
