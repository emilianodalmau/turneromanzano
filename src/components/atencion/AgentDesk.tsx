'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { Area, Desk, QueueTicket } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Users, Bell, LogOut, Check, X } from 'lucide-react';

interface AgentDeskProps {
    desk: Desk;
    area: Area;
    onExit: () => void;
}

function TicketList({ title, tickets }: { title: string; tickets: QueueTicket[] }) {
    if (tickets.length === 0) {
        return (
            <div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">No hay tickets en esta sección.</p>
            </div>
        );
    }

    return (
        <div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <div className="space-y-2">
                {tickets.map(ticket => (
                    <Card key={ticket.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center">
                            <Badge variant="secondary" className="text-lg font-bold mr-4">{ticket.ticketNumber}</Badge>
                            <div className="text-sm">
                                {ticket.type === 'walk_in' ? (
                                    <div className="flex items-center"><User className="w-4 h-4 mr-1" /> Sin Cita</div>
                                ) : (
                                    <div className="flex items-center"><Users className="w-4 h-4 mr-1" /> Con Cita</div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export function AgentDesk({ desk, area, onExit }: AgentDeskProps) {
    const firestore = useFirestore();

    const ticketsQuery = useMemoFirebase(
        () => firestore ? query(
            collection(firestore, 'queueTickets'),
            where('areaId', '==', area.id),
            where('status', 'in', ['waiting', 'called', 'attending']),
            orderBy('createdAt', 'asc')
        ) : null,
        [firestore, area.id]
    );

    const { data: tickets, isLoading } = useCollection<QueueTicket>(ticketsQuery);

    const waitingTickets = useMemo(() => tickets?.filter(t => t.status === 'waiting') || [], [tickets]);
    const calledTicket = useMemo(() => tickets?.find(t => t.status === 'called' && t.deskId === desk.id) || null, [tickets, desk.id]);
    const attendingTicket = useMemo(() => tickets?.find(t => t.status === 'attending' && t.deskId === desk.id) || null, [tickets, desk.id]);
    
    const handleCallNext = () => {
        if (!firestore || waitingTickets.length === 0) return;
        const nextTicket = waitingTickets[0];
        const ticketRef = doc(firestore, 'queueTickets', nextTicket.id);
        updateDocumentNonBlocking(ticketRef, { 
            status: 'called', 
            deskId: desk.id,
            calledAt: new Date().toISOString()
        });
    };

    const handleAttend = () => {
        if (!firestore || !calledTicket) return;
        const ticketRef = doc(firestore, 'queueTickets', calledTicket.id);
        updateDocumentNonBlocking(ticketRef, { status: 'attending' });
    };

    const handleFinish = () => {
        if (!firestore || !attendingTicket) return;
        const ticketRef = doc(firestore, 'queueTickets', attendingTicket.id);
        updateDocumentNonBlocking(ticketRef, { status: 'finished' });
    };
    
    const handleAbsent = () => {
        const ticketToMark = calledTicket || attendingTicket;
        if (!firestore || !ticketToMark) return;
        const ticketRef = doc(firestore, 'queueTickets', ticketToMark.id);
        updateDocumentNonBlocking(ticketRef, { status: 'absent' });
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">{desk.name}</h2>
                    <p className="text-muted-foreground">{area.name}</p>
                </div>
                <Button variant="outline" onClick={onExit}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Salir del puesto
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna de Controles y Ticket Actual */}
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Controles</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col space-y-3">
                             <Button onClick={handleCallNext} disabled={waitingTickets.length === 0 || !!calledTicket || !!attendingTicket} size="lg">
                                <Bell className="mr-2 h-5 w-5" />
                                Llamar Siguiente
                            </Button>
                            <Button onClick={handleAttend} disabled={!calledTicket}>
                                <Check className="mr-2 h-4 w-4" />
                                Atender
                            </Button>
                             <Button onClick={handleFinish} disabled={!attendingTicket} variant="default">
                                <Check className="mr-2 h-4 w-4" />
                                Finalizar Atención
                            </Button>
                            <Button onClick={handleAbsent} disabled={!calledTicket && !attendingTicket} variant="destructive">
                                <X className="mr-2 h-4 w-4" />
                                Marcar como Ausente
                            </Button>
                        </CardContent>
                    </Card>

                    {calledTicket && (
                        <Card className="border-primary ring-2 ring-primary">
                            <CardHeader>
                                <CardTitle className="text-center">Llamando al Turno</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-6xl font-bold">{calledTicket.ticketNumber}</p>
                            </CardContent>
                        </Card>
                    )}
                    
                     {attendingTicket && (
                        <Card className="border-green-500">
                            <CardHeader>
                                <CardTitle className="text-center">Atendiendo Actualmente</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <p className="text-6xl font-bold">{attendingTicket.ticketNumber}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Columna de Lista de Espera */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cola de Espera</CardTitle>
                            <CardDescription>
                                {waitingTickets.length} persona(s) esperando en el área de {area.name}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TicketList title="En espera" tickets={waitingTickets} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}