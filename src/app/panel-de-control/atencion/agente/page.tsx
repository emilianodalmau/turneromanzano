'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Area, Desk } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AgentDesk } from '@/components/atencion/AgentDesk';

export default function AgentPage() {
    const { profile, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [selectedDeskId, setSelectedDeskId] = useState<string>('');

    const desksQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'desks') : null),
        [firestore]
    );
    const areasQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'areas') : null),
        [firestore]
    );

    const { data: desks, isLoading: isLoadingDesks } = useCollection<Desk>(desksQuery);
    const { data: areas, isLoading: isLoadingAreas } = useCollection<Area>(areasQuery);

    const availableDesks = useMemo(() => {
        if (!desks || !profile) return [];
        // For now, super_admin can see all desks. Other roles could be filtered.
        return desks;
    }, [desks, profile]);

    const handleDeskSelection = (deskId: string) => {
        setSelectedDeskId(deskId);
    };

    const isLoadingInitialData = isUserLoading || isLoadingDesks || isLoadingAreas;
    
    // Initial loading state before anything is selected
    if (isLoadingInitialData && !desks && !areas) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando...</p>
            </div>
        );
    }

    // Desk selection view
    if (!selectedDeskId) {
        return (
            <div className="flex items-center justify-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Seleccionar Puesto de Trabajo</CardTitle>
                        <CardDescription>
                            Elige el escritorio desde el cual estás trabajando hoy.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select onValueChange={handleDeskSelection}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un escritorio..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDesks.map(desk => (
                                    <SelectItem key={desk.id} value={desk.id}>
                                        {desk.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         {(availableDesks.length === 0 && !isLoadingDesks) && (
                            <p className="text-sm text-muted-foreground text-center">No hay escritorios configurados. Un administrador debe crearlos.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // After a desk is selected, find the desk and area data.
    // This will re-evaluate whenever `desks` or `areas` data updates.
    const selectedDesk = desks?.find(d => d.id === selectedDeskId);
    const deskArea = areas?.find(a => a.id === selectedDesk?.areaId);

    // If we have a deskId but haven't found the corresponding desk/area objects yet, show a loading screen.
    // This handles the transition period where the selection is made but data might still be streaming in.
    if (!selectedDesk || !deskArea) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Cargando datos del puesto...</p>
            </div>
        );
    }

    // Once both desk and area are fully resolved, render the AgentDesk component.
    return (
        <AgentDesk 
            desk={selectedDesk} 
            area={deskArea}
            onExit={() => setSelectedDeskId('')} 
        />
    );
}
