'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { Appointment, ScheduleConfiguration, TimeSlot, DayKey, User } from '@/lib/types';
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
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const editFormSchema = z.object({
  responsibleName: z.string().min(1, 'El nombre es requerido.'),
  schoolName: z.string().min(1, 'El nombre de la institución es requerido.'),
  visitorCount: z.coerce.number().min(1, 'Debe haber al menos 1 visitante.').max(70, 'El máximo es 70 visitantes.'),
  date: z.date({ required_error: 'Se requiere una fecha para la visita.' }),
  timeSlot: z.string().min(1, 'Se requiere seleccionar un horario.'),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres.'),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
});

type EditFormValues = z.infer<typeof editFormSchema>;

function EditAppointmentSheet({ appointment }: { appointment: Appointment }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    
    const scheduleRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'scheduleConfigurations', 'default') : null),
        [firestore]
    );

    const userRef = useMemoFirebase(
        () => (firestore && appointment.userId ? doc(firestore, 'users', appointment.userId) : null),
        [firestore, appointment.userId]
    );

    const appointmentsCollectionRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'appointments') : null),
        [firestore]
    );

    const { data: scheduleConfig, isLoading: isScheduleLoading } = useDoc<ScheduleConfiguration>(scheduleRef);
    const { data: userData, isLoading: isUserLoading } = useDoc<User>(userRef);
    const { data: allAppointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsCollectionRef);

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editFormSchema),
        defaultValues: {
            responsibleName: appointment.responsibleName,
            schoolName: appointment.schoolName,
            visitorCount: appointment.visitorCount,
            date: new Date(appointment.date + 'T00:00:00'),
            timeSlot: appointment.startTime,
            status: appointment.status,
            dni: '',
            email: '',
            phone: '',
        },
    });
    
    useEffect(() => {
        if (userData) {
            form.setValue('dni', userData.dni);
            form.setValue('email', userData.email);
            form.setValue('phone', userData.phone);
        }
    }, [userData, form]);


    const selectedDate = form.watch('date');
    const visitorCount = form.watch('visitorCount');

    useEffect(() => {
        if (!selectedDate || !scheduleConfig || areAppointmentsLoading) {
            setAvailableSlots([]);
            return;
        }

        const dayKey = (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as DayKey[])[selectedDate.getDay()];
        const dayConfig = scheduleConfig.days[dayKey];

        if (!dayConfig || !dayConfig.enabled) {
            setAvailableSlots([]);
            return;
        }

        const appointmentsOnSelectedDate = (allAppointments || [])
            .filter(app => app.date === format(selectedDate, 'yyyy-MM-dd') && app.id !== appointment.id);

        const available = dayConfig.slots.filter((slot) => {
            const visitorsInSlot = appointmentsOnSelectedDate
                .filter((app) => app.startTime === slot.startTime)
                .reduce((sum, app) => sum + app.visitorCount, 0);
            
            const remainingCapacity = slot.capacity - visitorsInSlot;
            return remainingCapacity >= visitorCount;
        });

        setAvailableSlots(available);
    }, [selectedDate, visitorCount, scheduleConfig, allAppointments, areAppointmentsLoading, form, appointment.id]);

    async function onSubmit(data: EditFormValues) {
        if (!firestore) return;

        const selectedSlot = scheduleConfig?.days[(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as DayKey[])[data.date.getDay()]]
                                .slots.find(slot => slot.startTime === data.timeSlot);

        if (!selectedSlot) {
            toast({ variant: 'destructive', title: 'Error', description: 'El horario no es válido.' });
            return;
        }
        
        // Update user data
        if (userRef) {
            const [firstName, ...lastNameParts] = data.responsibleName.split(' ');
            const userUpdate = {
                name: firstName || '',
                lastName: lastNameParts.join(' '),
                dni: data.dni,
                email: data.email,
                phone: data.phone,
            };
            setDocumentNonBlocking(userRef, userUpdate, { merge: true });
        }


        const appointmentRef = doc(firestore, 'appointments', appointment.id);
        const updatedAppointment = {
            ...appointment,
            responsibleName: data.responsibleName,
            schoolName: data.schoolName,
            visitorCount: data.visitorCount,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            status: data.status,
        };

        setDocumentNonBlocking(appointmentRef, updatedAppointment, { merge: true });
        toast({
            title: 'Turno Actualizado',
            description: 'La cita ha sido actualizada correctamente.',
        });
        setIsOpen(false);
    }
    
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="w-full">Editar</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Editar Turno</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField control={form.control} name="schoolName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Institución</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="responsibleName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Responsable</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="dni" render={({ field }) => (
                                <FormItem>
                                <FormLabel>DNI del responsable</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 30123456" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email de contacto</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="ejemplo@correo.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Teléfono de contacto</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 1122334455" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="visitorCount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Visitantes</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange}
                                                disabled={(date) => {
                                                    if (isScheduleLoading || !scheduleConfig) return true;
                                                    const dayKey = (['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as DayKey[])[date.getDay()];
                                                    return !scheduleConfig.days[dayKey]?.enabled || date < new Date(new Date().setHours(0,0,0,0));
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="timeSlot" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Horario</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate || availableSlots.length === 0}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un horario" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    {availableSlots.map(slot => (
                                        <SelectItem key={slot.startTime} value={slot.startTime}>
                                            {`${slot.startTime} - ${slot.endTime}`}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="confirmed">Confirmado</SelectItem>
                                            <SelectItem value="cancelled">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <Button type="submit">Guardar Cambios</Button>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    );
}


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

    const handlePaidToggle = (appointment: Appointment, paid: boolean) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'appointments', appointment.id);
        setDocumentNonBlocking(docRef, { paid }, { merge: true });
        toast({
            title: 'Estado de pago actualizado',
            description: `El turno ahora está marcado como ${paid ? 'Pagado' : 'No Pagado'}.`,
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
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">Responsable: {appointment.responsibleName}</p>
                                    <p className="text-sm text-muted-foreground">Visitantes: {appointment.visitorCount}</p>
                                    <div className="flex items-center">
                                        <p className="text-sm text-muted-foreground mr-2">Estado:</p>
                                        <Badge variant={getStatusVariant(appointment.status)}>{getStatusText(appointment.status)}</Badge>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id={`paid-switch-${appointment.id}`}
                                            checked={!!appointment.paid}
                                            onCheckedChange={(checked) => handlePaidToggle(appointment, checked)}
                                        />
                                        <Label htmlFor={`paid-switch-${appointment.id}`}>Pagado</Label>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <EditAppointmentSheet appointment={appointment} />
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

    