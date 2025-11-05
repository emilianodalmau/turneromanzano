'use client';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ConfirmationPage() {
    const searchParams = useSearchParams();
    const date = searchParams.get('date');
    const time = searchParams.get('time');

    const formattedDate = date ? format(new Date(date), 'PPPP', { locale: es }) : 'Fecha no especificada';

    return (
        <div className="container mx-auto px-4 md:px-6 py-12 flex items-center justify-center">
            <Card className="max-w-lg w-full text-center">
                <CardHeader>
                    <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-headline mt-4">¡Turno Confirmado!</CardTitle>
                    <CardDescription>Su reserva se ha completado con éxito.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        Le hemos enviado un correo electrónico de confirmación con los detalles de su visita.
                    </p>
                    <div className="text-left bg-muted p-4 rounded-lg space-y-2">
                        <h4 className="font-semibold text-primary">Detalles de la Reserva</h4>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{time} hs.</span>
                        </div>
                    </div>
                    <Button asChild className="w-full">
                        <Link href="/">Volver al Inicio</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
