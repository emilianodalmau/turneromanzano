'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Appointment } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function AppointmentList({ appointments }: { appointments: Appointment[] }) {
    const groupedAppointments = useMemo(() => {
        if (!appointments) return {};
        
        // Secondary sort by startTime on the client
        const sortedAppointments = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));

        return sortedAppointments.reduce((acc, appointment) => {
            const date = appointment.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(appointment);
            return acc;
        }, {} as Record<string, Appointment[]>);
    }, [appointments]);

    const getStatusVariant = (status: Appointment['status']) => {
        switch (status) {
            case 'pending':
                return 'secondary';
            case 'confirmed':
                return 'default';
            case 'cancelled':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const getStatusText = (status: Appointment['status']) => {
        switch (status) {
            case 'pending':
                return 'Pendiente';
            case 'confirmed':
                return 'Confirmado';
            case 'cancelled':
                return 'Cancelado';
            default:
                return 'Desconocido';
        }
    };

    if (!appointments || appointments.length === 0) {
        return <p>No hay turnos registrados por el momento.</p>;
    }

    // Get sorted dates
    const sortedDates = Object.keys(groupedAppointments).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());


    return (
        <div className="space-y-8">
            {sortedDates.map((date) => (
                <div key={date}>
                    <h2 className="text-xl font-semibold mb-4 capitalize">
                        {format(new Date(date + 'T00:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupedAppointments[date].map((appointment) => (
                            <Card key={appointment.id}>
                                <CardHeader>
                                    <CardTitle>{`${appointment.startTime} - ${appointment.endTime}`}</CardTitle>
                                    <CardDescription>{appointment.schoolName}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Responsable: {appointment.responsibleName}</p>
                                    <p className="text-sm text-muted-foreground">Visitantes: {appointment.visitorCount}</p>
                                    <div className="flex items-center">
                                        <p className="text-sm text-muted-foreground mr-2">Estado:</p>
                                        <Badge variant={getStatusVariant(appointment.status)}>{getStatusText(appointment.status)}</Badge>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className="w-full">Gestionar</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function GestionTurnosPage() {
    const firestore = useFirestore();

    const appointmentsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'appointments'), orderBy('date', 'desc')) : null),
        [firestore]
    );

    const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

    if (isLoading) {
        return <p>Cargando turnos...</p>;
    }

    return <AppointmentList appointments={appointments || []} />;
}
