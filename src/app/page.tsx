'use client';

import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  if (isUserLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Punto de Partida de Firebase</h1>
      
      {user ? (
        <div>
          <p className="mb-4">Bienvenido, <span className="font-semibold">{user.email || 'Usuario'}</span>!</p>
          <Button 
            onClick={() => signOut(auth)} 
            variant="destructive"
          >
            Cerrar Sesión
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p>No has iniciado sesión.</p>
          <Button asChild>
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
