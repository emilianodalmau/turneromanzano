'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          Bienvenidos al gestor de turnos del Museo del Manzano Historico
        </h1>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/login" passHref>
            <Button>Iniciar Sesión</Button>
          </Link>
          <Link href="/turnos" passHref>
            <Button variant="outline">Turnos Museo</Button>
          </Link>
           <Link href="/turnos-licencias" passHref>
            <Button variant="outline">Turnos Licencias</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
