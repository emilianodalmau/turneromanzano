'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { LicenseAppointment, LicenseScheduleConfiguration, TimeSlot, DayKey, User, procedureTypes } from '@/lib/types';
import { collection, query, doc } from 'firebase/firestore';
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
import { CalendarIcon, Search, X as XIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const editFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  lastName: z.string().min(1, "El apellido es requerido."),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres.'),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  procedureType: z.string().min(1, 'Se requiere seleccionar un tipo de trámite.'),
  date: z.date({ required_error: 'Se requiere una fecha para el turno.' }),
  timeSlot: z.string().min(1, 'Se requiere seleccionar un horario.'),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
});

type EditFormValues = z.infer<typeof editFormSchema>;

const dayNamesInEnglish: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


function EditLicenseAppointmentSheet({ appointment }: { appointment: LicenseAppointment }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isOpen, setIsOpen] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    
    const scheduleRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'licenseScheduleConfigurations', 'default') : null),
        [firestore]
    );

    const userRef = useMemoFirebase(
        () => (firestore && appointment.userId ? doc(firestore, 'users', appointment.userId) : null),
        [firestore, appointment.userId]
    );

    const appointmentsCollectionRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'licenseAppointments') : null),
        [firestore]
    );

    const { data: scheduleConfig, isLoading: isScheduleLoading } = useDoc<LicenseScheduleConfiguration>(scheduleRef);
    const { data: userData, isLoading: isUserLoading } = useDoc<User>(userRef);
    const { data: allAppointments, isLoading: areAppointmentsLoading } = useCollection<LicenseAppointment>(appointmentsCollectionRef);
    
    const defaultValues = useMemo(() => ({
        name: userData?.name || '',
        lastName: userData?.lastName || '',
        dni: userData?.dni || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
        procedureType: appointment.procedureType,
        date: new Date(appointment.date + 'T00:00:00'),
        timeSlot: appointment.startTime,
        status: appointment.status,
    }), [appointment, userData]);

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editFormSchema),
        defaultValues
    });
    
    useEffect(() => {
        if(userData) {
            form.reset(defaultValues);
        }
    }, [userData, defaultValues, form]);


    const selectedDate = form.watch('date');

    useEffect(() => {
        if (!selectedDate || !scheduleConfig || areAppointmentsLoading) {
            setAvailableSlots([]);
            return;
        }

        const dayKey = dayNamesInEnglish[selectedDate.getDay()];
        const dayConfig = scheduleConfig.days[dayKey];

        if (!dayConfig || !dayConfig.enabled) {
            setAvailableSlots([]);
            return;
        }

        const appointmentsOnSelectedDate = (allAppointments || [])
            .filter(app => app.date === format(selectedDate, 'yyyy-MM-dd') && app.id !== appointment.id);

        const available = dayConfig.slots.filter((slot) => {
            const appointmentsInSlot = appointmentsOnSelectedDate
                .filter((app) => app.startTime === slot.startTime)
                .length;
            
            return appointmentsInSlot < slot.capacity;
        });

        setAvailableSlots(available);
    }, [selectedDate, scheduleConfig, allAppointments, areAppointmentsLoading, appointment.id]);

    async function onSubmit(data: EditFormValues) {
        if (!firestore) return;

        const selectedSlot = scheduleConfig?.days[dayNamesInEnglish[data.date.getDay()]]
                                .slots.find(slot => slot.startTime === data.timeSlot);

        if (!selectedSlot) {
            toast({ variant: 'destructive', title: 'Error', description: 'El horario no es válido.' });
            return;
        }
        
        if (userRef) {
            const userUpdate = {
                name: data.name,
                lastName: data.lastName,
                dni: data.dni,
                email: data.email,
                phone: data.phone,
            };
            setDocumentNonBlocking(userRef, userUpdate, { merge: true });
        }


        const appointmentRef = doc(firestore, 'licenseAppointments', appointment.id);
        const updatedAppointment = {
            ...appointment,
            procedureType: data.procedureType,
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
                    <SheetTitle>Editar Turno de Licencia</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="lastName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Apellido</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            </div>
                             <FormField control={form.control} name="dni" render={({ field }) => (
                                <FormItem>
                                <FormLabel>DNI</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 30123456" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="ejemplo@correo.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 2622123456" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField
                                control={form.control}
                                name="procedureType"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Tipo de Trámite</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un trámite" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {procedureTypes.map(proc => (
                                            <SelectItem key={proc.id} value={proc.name}>
                                            {proc.name}
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                                    const dayKey = dayNamesInEnglish[date.getDay()];
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

type AppointmentWithUser = LicenseAppointment & { user?: User };

function LicenseAppointmentList({ appointments, users }: { appointments: LicenseAppointment[]; users: User[] }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const appointmentsWithUsers = useMemo(() => {
        const usersById = new Map(users.map(u => [u.id, u]));
        return appointments.map(app => ({
            ...app,
            user: usersById.get(app.userId),
        }));
    }, [appointments, users]);

    const [filters, setFilters] = useState({
        searchText: '',
        date: undefined as Date | undefined,
    });

    const handleFilterChange = (name: keyof typeof filters, value: any) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            searchText: '',
            date: undefined,
        });
    };

    const filteredAppointments = useMemo(() => {
        return appointmentsWithUsers.filter(appointment => {
            if (filters.date && appointment.date !== format(filters.date, 'yyyy-MM-dd')) {
                return false;
            }
            
            if (filters.searchText) {
                const searchTerm = filters.searchText.toLowerCase();
                const userName = appointment.user?.name.toLowerCase() || '';
                const userLastName = appointment.user?.lastName.toLowerCase() || '';
                const userDni = appointment.user?.dni.toLowerCase() || '';
                const procedureType = appointment.procedureType.toLowerCase();

                if (
                    !`${userName} ${userLastName}`.includes(searchTerm) &&
                    !userDni.includes(searchTerm) &&
                    !procedureType.includes(searchTerm)
                ) {
                    return false;
                }
            }
            
            return true;
        });
    }, [appointmentsWithUsers, filters]);

    const handleDelete = (appointmentId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'licenseAppointments', appointmentId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: 'Turno Eliminado',
            description: 'La cita ha sido eliminada correctamente.',
        });
    };

    const groupedAppointments = useMemo(() => {
        const sortedAppointments = [...filteredAppointments].sort((a, b) => {
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
        }, {} as Record<string, AppointmentWithUser[]>);
    }, [filteredAppointments]);

    const getStatusVariant = (status: LicenseAppointment['status']) => {
        switch (status) {
            case 'pending': return 'secondary';
            case 'confirmed': return 'default';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const getStatusText = (status: LicenseAppointment['status']) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'confirmed': return 'Confirmado';
            case 'cancelled': return 'Cancelado';
            default: return 'Desconocido';
        }
    };
    
    const sortedDates = Object.keys(groupedAppointments).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, DNI, trámite..."
                            value={filters.searchText}
                            onChange={(e) => handleFilterChange('searchText', e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("justify-start text-left font-normal", !filters.date && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.date ? format(filters.date, "PPP", { locale: es }) : <span>Filtrar por fecha</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={filters.date}
                                onSelect={(date) => handleFilterChange('date', date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-2">
                        <XIcon className="h-4 w-4" />
                        Limpiar Filtros
                    </Button>
                </CardContent>
            </Card>
            
            {filteredAppointments.length === 0 && (
                 <p>No se encontraron turnos que coincidan con los filtros aplicados.</p>
            )}

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
                                    <CardDescription>{appointment.procedureType}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">Solicitante: {appointment.user?.name} {appointment.user?.lastName}</p>
                                    <p className="text-sm text-muted-foreground">DNI: {appointment.user?.dni}</p>
                                    <div className="flex items-center">
                                        <p className="text-sm text-muted-foreground mr-2">Estado:</p>
                                        <Badge variant={getStatusVariant(appointment.status)}>{getStatusText(appointment.status)}</Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <EditLicenseAppointmentSheet appointment={appointment} />
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
             {appointments.length > 0 && sortedDates.length === 0 && (
                <p>No hay turnos registrados por el momento.</p>
            )}
        </div>
    );
}

export default function TurnosLicenciasPage() {
    const firestore = useFirestore();

    const appointmentsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'licenseAppointments')) : null),
        [firestore]
    );

    const usersQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'users') : null),
        [firestore]
    );

    const { data: appointments, isLoading: isLoadingAppointments } = useCollection<LicenseAppointment>(appointmentsQuery);
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

    if (isLoadingAppointments || isLoadingUsers) {
        return <p>Cargando turnos...</p>;
    }

    return <LicenseAppointmentList appointments={appointments || []} users={users || []} />;
}

    
