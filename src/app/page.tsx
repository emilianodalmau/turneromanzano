'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-8">
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
          <Link href="/totem" passHref>
            <Button variant="secondary">Totem de Atención</Button>
          </Link>
           <Link href="/pantalla" passHref>
            <Button variant="secondary">Pantalla de Turnos</Button>
          </Link>
          <Link href="/test" passHref>
            <Button variant="destructive">Test</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
