'use client';

import { useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from 'zod';
import { collectionGroup, doc, collection } from 'firebase/firestore';

import { Appointment } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const appointmentFormSchema = z.object({
    name: z.string().min(1, 'Nombre es requerido'),
    lastName: z.string().min(1, 'Apellido es requerido'),
    dni: z.string().min(7, 'DNI es requerido'),
    phone: z.string().min(1, 'Teléfono es requerido'),
    email: z.string().email('Email inválido'),
    date: z.string().min(1, 'Fecha es requerida'),
    time: z.string().min(1, 'Hora es requerida'),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export function AppointmentDataTable() {
  const { user } = useUser();
  const firestore = useFirestore();
  // Only create the query if the user is logged in
  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'appointments');
  }, [firestore, user]);
  
  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setFormOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const { toast } = useToast();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: { name: '', lastName: '', dni: '', phone: '', email: '', date: '', time: '' },
  });

  const sortedData = useMemo(() => {
    if (!appointments) return [];
    return [...appointments].sort((a,b) => {
        const aTime = a.createdAt ? (a.createdAt.seconds * 1000) : new Date(`${a.date}T${a.time}`).getTime();
        const bTime = b.createdAt ? (b.createdAt.seconds * 1000) : new Date(`${b.date}T${b.time}`).getTime();
        return bTime - aTime;
    });
  }, [appointments]);

  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    form.reset({
      ...appointment,
      date: format(new Date(appointment.date), 'yyyy-MM-dd')
    });
    setFormOpen(true);
  };
  
  const handleCreate = () => {
    setSelectedAppointment(null);
    form.reset({ name: '', lastName: '', dni: '', phone: '', email: '', date: '', time: '' });
    setFormOpen(true);
  };

  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedAppointment) return;

    startTransition(() => {
        const appointmentRef = doc(firestore, `users/${selectedAppointment.userId}/appointments/${selectedAppointment.id}`);
        deleteDocumentNonBlocking(appointmentRef);
        toast({ title: 'Turno eliminado', description: 'El turno ha sido eliminado con éxito.' });
        setAlertOpen(false);
        setSelectedAppointment(null);
    });
  };

  const onSubmit = (values: AppointmentFormValues) => {
    startTransition(() => {
        let docRef;
        let userId = selectedAppointment?.userId;
        let appointmentId = selectedAppointment?.id;

        const payload: Omit<Appointment, 'createdAt'> = {
            id: '',
            userId: '',
            name: values.name,
            lastName: values.lastName,
            dni: values.dni,
            phone: values.phone,
            email: values.email,
            date: values.date,
            time: values.time,
        };

        if (selectedAppointment) { // Editing
            userId = selectedAppointment.userId;
            appointmentId = selectedAppointment.id;
            docRef = doc(firestore, `users/${userId}/appointments/${appointmentId}`);
            payload.id = appointmentId;
            payload.userId = userId;
        } else { // Creating
            // This is a simplified approach. In a real-world scenario, you would
            // likely have a more robust way to handle user creation or selection
            // for admin-created appointments. Here we'll just create a new user doc path.
            const userRef = doc(collection(firestore, 'users'));
            userId = userRef.id;
            const newAppointmentRef = doc(collection(firestore, `users/${userId}/appointments`));
            appointmentId = newAppointmentRef.id;
            
            docRef = newAppointmentRef;
            payload.id = appointmentId;
            payload.userId = userId;
            
            // Also create the user profile
            const userPayload = { id: userId, ...values };
            setDocumentNonBlocking(userRef, userPayload, { merge: false });
        }
        
        setDocumentNonBlocking(docRef, payload, { merge: true });
        
        toast({ title: selectedAppointment ? 'Turno actualizado' : 'Turno creado' });
        setFormOpen(false);
        setSelectedAppointment(null);
    });
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Turno
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>Visitante</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : sortedData.length > 0 ? (
              sortedData.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="font-medium">{format(new Date(appointment.date), "PPP", { locale: es })}</div>
                    <div className="text-sm text-muted-foreground">{appointment.time} hs.</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{appointment.name} {appointment.lastName}</div>
                    <div className="text-sm text-muted-foreground">DNI: {appointment.dni}</div>
                  </TableCell>
                  <TableCell>
                     <div className="text-sm">{appointment.email}</div>
                     <div className="text-sm text-muted-foreground">{appointment.phone}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(appointment)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(appointment)} className="text-destructive">Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay turnos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAppointment ? 'Editar Turno' : 'Crear Turno'}</DialogTitle>
            <DialogDescription>
              {selectedAppointment ? 'Modifique los detalles del turno.' : 'Complete los detalles para un nuevo turno.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="name">Nombre</Label><Input id="name" {...form.register('name')} /></div>
                <div><Label htmlFor="lastName">Apellido</Label><Input id="lastName" {...form.register('lastName')} /></div>
            </div>
            <div><Label htmlFor="dni">DNI</Label><Input id="dni" {...form.register('dni')} /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...form.register('email')} /></div>
            <div><Label htmlFor="phone">Teléfono</Label><Input id="phone" {...form.register('phone')} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="date">Fecha</Label><Input id="date" type="date" {...form.register('date')} /></div>
                <div><Label htmlFor="time">Hora</Label><Input id="time" type="time" {...form.register('time')} /></div>
            </div>
          
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Guardar
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el turno de {selectedAppointment?.name} {selectedAppointment?.lastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
               {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
               Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
