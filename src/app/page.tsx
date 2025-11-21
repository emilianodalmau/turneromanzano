
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Ticket, Shield, LogIn, Monitor, Tv } from 'lucide-react';
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
    {
      title: 'Turnos para Licencias de Conducir',
      description: 'Gestiona tu turno para trámites de licencia de conducir.',
      href: '/turnos-licencias',
      icon: Shield,
    },
  ];

  const adminAndTools = [
     {
      title: 'Sistema de Turnos Presencial',
      description: 'Genera un ticket para ser atendido en el momento.',
      href: '/totem',
      icon: Monitor,
    },
     {
      title: 'Ver Pantalla de Turnos',
      description: 'Visualiza los últimos turnos llamados en las pantallas.',
      href: '/pantalla',
      icon: Tv,
      target: '_blank'
    },
    {
      title: 'Acceso Personal',
      description: 'Inicia sesión para administrar turnos y configuraciones.',
      href: '/login',
      icon: LogIn,
    },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
       <div className="flex flex-col items-center justify-center text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Sistema de Turnos de Tunuyán</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Bienvenido al portal de gestión de turnos de la Municipalidad de Tunuyán. Aquí puedes solicitar tus turnos para museos y licencias de conducir de manera rápida y sencilla.
        </p>

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
            <h2 className="text-2xl font-semibold mb-6">¿Qué trámite necesitas hacer?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="w-full max-w-4xl pt-8">
            <h2 className="text-2xl font-semibold mb-6">Herramientas y Acceso</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {adminAndTools.map((action) => (
                    <Link key={action.href} href={action.href} passHref target={action.target || '_self'}>
                        <Card className="h-full flex flex-col justify-between hover:bg-muted/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <action.icon className="w-6 h-6 text-muted-foreground"/>
                                    <CardTitle className="text-lg">{action.title}</CardTitle>
                                </div>
                            </CardHeader>
                             <CardContent>
                                 <p className="text-sm text-muted-foreground">{action.description}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}
