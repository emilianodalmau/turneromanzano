'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Area, Desk } from '@/lib/types';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DeskForm } from '@/components/atencion/DeskForm';
import { Computer, PlusCircle, Trash2 } from 'lucide-react';

type DeskWithAreaName = Desk & { areaName?: string };

function DeskList({ desks, areas }: { desks: DeskWithAreaName[], areas: Area[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const desksWithAreaNames = useMemo(() => {
        const areaMap = new Map(areas.map(area => [area.id, area.name]));
        return desks.map(desk => ({
            ...desk,
            areaName: areaMap.get(desk.areaId) || 'Sin área asignada'
        }));
    }, [desks, areas]);

    const handleDelete = (deskId: string, deskName: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'desks', deskId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: 'Escritorio Eliminado',
            description: `El escritorio "${deskName}" ha sido eliminado.`,
            variant: 'destructive'
        });
    };

    if (desks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Computer className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No hay escritorios creados</h3>
                <p className="text-muted-foreground mt-2">
                    Comienza por crear un nuevo escritorio de atención para asignarle turnos.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {desksWithAreaNames.map((desk) => (
                <Card key={desk.id}>
                    <CardHeader>
                        <CardTitle>{desk.name}</CardTitle>
                        <CardDescription>Área: {desk.areaName}</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Badge variant={desk.status === 'active' ? 'default' : 'secondary'}>
                            {desk.status}
                        </Badge>
                     </CardContent>
                    <CardFooter className="flex justify-end">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará el escritorio permanentemente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(desk.id, desk.name)}>
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}


export default function GestionDesksPage() {
    const firestore = useFirestore();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

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

    if (isLoadingDesks || isLoadingAreas) {
        return <p>Cargando escritorios y áreas...</p>;
    }
    
    if (!areas || areas.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No hay áreas creadas</h3>
                <p className="text-muted-foreground mt-2">
                    Para poder crear un escritorio, primero debes crear al menos un área de atención.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Administrar Escritorios de Atención</h2>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nuevo Escritorio
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Nuevo Escritorio de Atención</SheetTitle>
                        </SheetHeader>
                        <div className="p-4">
                            <DeskForm areas={areas || []} onFormSubmit={() => setIsSheetOpen(false)} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            <DeskList desks={desks || []} areas={areas || []} />
        </div>
    );
}
