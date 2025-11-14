'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Area, QueueTicket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Ticket, Printer } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

function GenerateTicket({ onTicketGenerated }: { onTicketGenerated: (ticket: QueueTicket) => void }) {
    const firestore = useFirestore();
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const areasQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'areas') : null),
        [firestore]
    );

    const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);

    const generateTicketNumber = async (areaId: string): Promise<string> => {
        if (!firestore) return 'A-000';
        
        const areaPrefix = areas?.find(a => a.id === areaId)?.name.substring(0, 1).toUpperCase() || 'T';

        const today = format(new Date(), 'yyyy-MM-dd');

        const ticketsCollection = collection(firestore, 'queueTickets');
        // Simplified query to avoid composite index requirement
        const q = query(
            ticketsCollection,
            where('createdAt', '>=', today),
            where('createdAt', '<', today + '\uf8ff'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return `${areaPrefix}-101`;
        } else {
            const lastTicket = querySnapshot.docs[0].data() as QueueTicket;
            const lastNumberStr = lastTicket.ticketNumber.split('-')[1];
            const lastNumber = lastNumberStr ? parseInt(lastNumberStr) : 100;
            return `${areaPrefix}-${lastNumber + 1}`;
        }
    };


    const handleAreaSelection = async (area: Area) => {
        if (!firestore) return;
        setSelectedArea(area);
        setIsGenerating(true);

        try {
            const ticketNumber = await generateTicketNumber(area.id);
            const newTicket: Omit<QueueTicket, 'id'> = {
                ticketNumber,
                areaId: area.id,
                type: 'walk_in',
                status: 'waiting',
                createdAt: new Date().toISOString(),
            };

            const ticketsCollection = collection(firestore, 'queueTickets');
            const docRef = await addDocumentNonBlocking(ticketsCollection, newTicket);
            
            if (docRef) {
                onTicketGenerated({ ...newTicket, id: docRef.id });
            }

        } catch (error) {
            console.error("Error generating ticket:", error);
            // Aquí se podría mostrar un toast de error
        } finally {
            setIsGenerating(false);
        }
    };
    
    if (isLoadingAreas) {
        return (
            <div className="flex justify-center items-center">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas?.map((area) => (
                <Button 
                    key={area.id} 
                    onClick={() => handleAreaSelection(area)}
                    className="h-32 text-2xl font-bold"
                    disabled={isGenerating && selectedArea?.id === area.id}
                >
                    {isGenerating && selectedArea?.id === area.id ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                        area.name
                    )}
                </Button>
            ))}
        </div>
    );
}


export default function TotemPage() {
    const [generatedTicket, setGeneratedTicket] = useState<QueueTicket | null>(null);
    const [view, setView] = useState<'main' | 'generate'>('main');


    const handleTicketGenerated = (ticket: QueueTicket) => {
        setGeneratedTicket(ticket);
    };
    
    const handlePrintAndReset = () => {
        window.print();
        setGeneratedTicket(null);
        setView('main');
    };

    if (generatedTicket) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 print:bg-white print:text-black">
                 <Card className="w-full max-w-md text-center shadow-2xl print:shadow-none print:border-none">
                    <CardHeader>
                        <CardDescription className="text-xl">Su turno es</CardDescription>
                        <CardTitle className="text-8xl font-black tracking-tighter">
                            {generatedTicket.ticketNumber}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-lg">Por favor, espere a ser llamado en la pantalla.</p>
                        <p className="text-muted-foreground text-sm">
                            Generado: {format(new Date(generatedTicket.createdAt), "dd/MM/yyyy HH:mm")}
                        </p>
                    </CardContent>
                </Card>
                <div className="mt-8 flex flex-col gap-4 w-full max-w-md print:hidden">
                    <Button onClick={handlePrintAndReset} size="lg">
                        <Printer className="mr-2 h-6 w-6" /> Imprimir y Finalizar
                    </Button>
                     <Button variant="outline" onClick={() => { setGeneratedTicket(null); setView('main'); }}>
                        Volver al inicio
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-4xl p-8">
                <CardHeader className="text-center">
                    <CardTitle className="text-4xl font-bold">Bienvenido al Sistema de Turnos</CardTitle>
                    <CardDescription className="text-xl text-muted-foreground pt-2">Seleccione una opción para continuar</CardDescription>
                </CardHeader>
                <CardContent className="mt-8">
                    {view === 'main' && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Button variant="outline" className="h-40 text-2xl font-bold flex-col gap-2" disabled>
                                 <Ticket className="h-10 w-10"/>
                                 Tengo un turno (Check-in)
                                 <span className="text-sm font-normal">(Próximamente)</span>
                            </Button>
                            <Button onClick={() => setView('generate')} className="h-40 text-2xl font-bold">
                                Solicitar Turno sin Cita
                            </Button>
                        </div>
                    )}
                     {view === 'generate' && (
                        <div>
                            <h3 className="text-2xl font-semibold text-center mb-6">Seleccione el Área</h3>
                            <GenerateTicket onTicketGenerated={handleTicketGenerated} />
                            <div className="text-center mt-8">
                                <Button variant="ghost" onClick={() => setView('main')}>Volver</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                 <div className="text-center mt-8">
                    <Link href="/" passHref>
                        <Button variant="link">Ir a la página principal</Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}
