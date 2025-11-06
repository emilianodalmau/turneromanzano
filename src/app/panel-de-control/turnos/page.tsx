'use client';

import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Appointment } from '@/lib/types';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function AppointmentList({ appointments }: { appointments: Appointment[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = (appointmentId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'appointments', appointmentId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: 'Turno Eliminado',
            description: 'La cita ha sido eliminada correctamente.',
        });
    };

    const groupedAppointments = useMemo(() => {
        const sortedAppointments = [...appointments].sort((a, b) => {
            if (!a.startTime || !b.startTime) return 0;
            return a.startTime.localeCompare(b.startTime)
        });

        return sortedAppointments.reduce((acc, appointment) => {
            if (appointment.date) {
                const date = appointment.date;
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(appointment);
            }
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
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="w-full">Eliminar</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la cita.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(appointment.id)}>Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
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
