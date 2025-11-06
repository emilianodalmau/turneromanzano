'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          Bienvenidos a Turnos Manzano
        </h1>
        <p className="text-lg text-muted-foreground">
          Gestiona tus turnos de forma fácil y rápida.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/login" passHref>
            <Button>Iniciar Sesión</Button>
          </Link>
          <Link href="/turnos" passHref>
            <Button variant="outline">Turnos</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
