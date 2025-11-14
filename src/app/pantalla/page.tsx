'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { QueueTicket, Desk } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';

type DisplayTicket = {
    ticketNumber: string;
    deskName: string;
};

export default function PantallaTurnos() {
    const firestore = useFirestore();
    const [lastCalled, setLastCalled] = useState<DisplayTicket[]>([]);
    const [currentTicket, setCurrentTicket] = useState<DisplayTicket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const ticketsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'queueTickets') : null),
        [firestore]
    );
    const desksQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'desks') : null),
        [firestore]
    );

    const { data: tickets, isLoading: isLoadingTickets } = useCollection<QueueTicket>(ticketsQuery);
    const { data: desks, isLoading: isLoadingDesks } = useCollection<Desk>(desksQuery);
    
    // Memoize the desk map to prevent re-renders
    const deskMap = useMemo(() => {
        if (!desks) return new Map();
        return new Map(desks.map(d => [d.id, d.name]));
    }, [desks]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio('/notification.mp3');
            audio.muted = true; // Mute by default to prevent autoplay error
            audioRef.current = audio;
        }
    }, []);

    useEffect(() => {
        if (!tickets || !desks) return;

        const calledTickets = tickets
            .filter(t => (t.status === 'called' || t.status === 'attending') && t.calledAt)
            .sort((a, b) => new Date(b.calledAt!).getTime() - new Date(a.calledAt!).getTime());

        const latestTicketData = calledTickets[0];
        
        if (latestTicketData) {
             const newDisplayTicket: DisplayTicket = {
                ticketNumber: latestTicketData.ticketNumber,
                deskName: deskMap.get(latestTicketData.deskId || '') || '---',
            };

            // Play sound if the ticket is new
            if (currentTicket?.ticketNumber !== newDisplayTicket.ticketNumber) {
                 audioRef.current?.play().catch(e => console.warn("Could not play sound:", e.message));
            }
            
            setCurrentTicket(newDisplayTicket);

            // The rest of the called tickets are history
            const historyTickets = calledTickets.slice(1, 6).map(t => ({
                ticketNumber: t.ticketNumber,
                deskName: deskMap.get(t.deskId || '') || '---',
            }));
            setLastCalled(historyTickets);

        } else {
            // No called tickets, clear everything
            setCurrentTicket(null);
            setLastCalled([]);
        }

    }, [tickets, desks, deskMap, currentTicket]);

    if (isLoadingTickets || isLoadingDesks) {
        return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white text-4xl">Cargando...</div>
    }

    return (
        <main className="h-screen w-screen bg-gray-900 text-white flex flex-col overflow-hidden">
            <header className="p-4 text-center">
                <h1 className="text-5xl font-bold">TURNOS DE ATENCIÓN</h1>
            </header>

            <div className="flex-grow grid grid-cols-3 gap-4 p-4">
                {/* Main Display */}
                <div className="col-span-3 lg:col-span-2 bg-blue-600 rounded-lg flex flex-col items-center justify-center p-8">
                    <AnimatePresence mode="wait">
                        {currentTicket ? (
                            <motion.div
                                key={currentTicket.ticketNumber}
                                initial={{ opacity: 0, y: -50 }}
                                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: "circOut" } }}
                                exit={{ opacity: 0, y: 50, transition: { duration: 0.3, ease: "circIn" } }}
                                className="text-center"
                            >
                                <h2 className="text-8xl md:text-9xl font-black tracking-tighter leading-none">{currentTicket.ticketNumber}</h2>
                                <p className="text-5xl md:text-6xl font-semibold mt-4">Escritorio {currentTicket.deskName}</p>
                            </motion.div>
                        ) : (
                             <h2 className="text-6xl font-bold">Esperando turnos...</h2>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* History */}
                <div className="col-span-3 lg:col-span-1 bg-gray-800 rounded-lg p-6 flex flex-col">
                    <h3 className="text-3xl font-bold mb-4 text-center">Últimos llamados</h3>
                    <div className="flex-grow space-y-4 overflow-hidden">
                         <AnimatePresence initial={false}>
                            {lastCalled.map((ticket) => (
                                <motion.div
                                    key={ticket.ticketNumber}
                                    layout
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.5, type: 'spring' }}
                                    className="flex justify-between items-center bg-gray-700 p-4 rounded-lg text-2xl"
                                >
                                    <span className="font-bold">{ticket.ticketNumber}</span>
                                    <span className="text-gray-300">Esc. {ticket.deskName}</span>
                                </motion.div>
                            ))}
                         </AnimatePresence>
                    </div>
                </div>
            </div>
             <footer className="text-center p-2 text-gray-400">
                Municipalidad de Tunuyán
            </footer>
        </main>
    );
}
