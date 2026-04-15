'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Ticket } from 'lucide-react';
import { useUser } from '@/firebase';

export default function Home() {
  const { user, isUserLoading } = useUser();

  const mainActions = [
    {
      title: 'Turnos para el Museo',
      description: 'Solicita un turno para visitas educativas al Manzano Histórico.',
      href: '/turnos',
      icon: Ticket,
    },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
       <div className="flex flex-col items-center justify-center text-center space-y-6">
        {isUserLoading ? (
            <p>Cargando...</p>
        ) : user ? (
            <Link href="/panel-de-control" passHref>
              <Button size="lg">
                Ir al Panel de Control <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
        ) : null}

        <div className="w-full max-w-4xl pt-8">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md mx-auto">
                {mainActions.map((action) => (
                <Card key={action.href} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <action.icon className="w-8 h-8 text-primary" />
                        <CardTitle>{action.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <CardDescription>{action.description}</CardDescription>
                    <Link href={action.href} passHref>
                        <Button className="mt-4 w-full">
                        Iniciar Trámite <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                    </CardContent>
                </Card>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}
