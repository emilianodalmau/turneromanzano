'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Area } from '@/lib/types';
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
import { AreaForm } from '@/components/atencion/AreaForm';
import { Briefcase, PlusCircle, Trash2 } from 'lucide-react';

function AreaList({ areas }: { areas: Area[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = (areaId: string, areaName: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'areas', areaId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: 'Área Eliminada',
            description: `El área "${areaName}" ha sido eliminada.`,
            variant: 'destructive'
        });
    };

    if (areas.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No hay áreas creadas</h3>
                <p className="text-muted-foreground mt-2">
                    Comienza por crear una nueva área de atención para organizar tus escritorios y turnos.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.map((area) => (
                <Card key={area.id}>
                    <CardHeader>
                        <CardTitle>{area.name}</CardTitle>
                        {area.description && <CardDescription>{area.description}</CardDescription>}
                    </CardHeader>
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
                                        Esta acción no se puede deshacer. Se eliminará el área permanentemente.
                                        Los escritorios asociados no se eliminarán pero quedarán sin área.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(area.id, area.name)}>
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


export default function GestionAreasPage() {
    const firestore = useFirestore();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const areasQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'areas') : null),
        [firestore]
    );

    const { data: areas, isLoading } = useCollection<Area>(areasQuery);

    if (isLoading) {
        return <p>Cargando áreas...</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Administrar Áreas de Atención</h2>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nueva Área
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Nueva Área de Atención</SheetTitle>
                        </SheetHeader>
                        <div className="p-4">
                            <AreaForm onFormSubmit={() => setIsSheetOpen(false)} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
            <AreaList areas={areas || []} />
        </div>
    );
}
