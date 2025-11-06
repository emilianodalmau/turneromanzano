'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { ScheduleConfiguration, DayKey, TimeSlot } from '@/lib/types';
import type { Appointment } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  lastName: z.string().min(1, 'El apellido es requerido.'),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres.'),
  schoolName: z.string().min(1, 'El nombre de la institución es requerido.'),
  visitorCount: z.coerce.number().min(1, 'Debe haber al menos 1 visitante.').max(70, 'El máximo es 70 visitantes.'),
  appointmentDate: z.date({ required_error: 'Debes seleccionar una fecha.' }),
  appointmentSlot: z.string({ required_error: 'Debes seleccionar un horario.' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AvailableSlot extends TimeSlot {
  display: string;
}

export default function TurnosPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const scheduleRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'scheduleConfigurations', 'default') : null),
    [firestore]
  );
  const { data: scheduleConfig, isLoading: isScheduleLoading } = useDoc<ScheduleConfiguration>(scheduleRef);

  const appointmentsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'appointments') : null), [firestore]);
  const { data: allAppointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsRef);

  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      lastName: '',
      email: '',
      phone: '',
      dni: '',
      schoolName: '',
      visitorCount: 1,
    },
  });

  const selectedDate = form.watch('appointmentDate');
  const visitorCount = form.watch('visitorCount');

  useEffect(() => {
    if (!selectedDate || !scheduleConfig || !allAppointments) {
      setAvailableSlots([]);
      return;
    }

    const dayKey = format(selectedDate, 'EEEE', { locale: es }).toLowerCase() as DayKey;
    const dayConfig = scheduleConfig.days[dayKey];

    if (!dayConfig || !dayConfig.enabled) {
      setAvailableSlots([]);
      return;
    }

    const appointmentsOnDate = allAppointments.filter(
      (app) => app.date === format(selectedDate, 'yyyy-MM-dd')
    );

    const slotsWithCapacity = dayConfig.slots
      .map((slot) => {
        const visitorsInSlot = appointmentsOnDate
          .filter((app) => app.startTime === slot.startTime)
          .reduce((total, app) => total + app.visitorCount, 0);
        
        const remainingCapacity = slot.capacity - visitorsInSlot;
        return { ...slot, remainingCapacity };
      })
      .filter((slot) => slot.remainingCapacity >= visitorCount)
      .map((slot) => ({
        ...slot,
        display: `${slot.startTime} - ${slot.endTime} (Capacidad restante: ${slot.remainingCapacity})`,
      }));
      
    setAvailableSlots(slotsWithCapacity);
    form.setValue('appointmentSlot', '');

  }, [selectedDate, visitorCount, scheduleConfig, allAppointments, form]);
  
  async function onSubmit(data: FormValues) {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
        return;
    }

    try {
        const userId = `user_${data.dni}_${Date.now()}`;
        const userRef = doc(firestore, 'users', userId);

        const newAppointment = {
            userId: userId,
            date: format(data.appointmentDate, 'yyyy-MM-dd'),
            startTime: data.appointmentSlot.split(' - ')[0],
            endTime: data.appointmentSlot.split(' - ')[1].split(' (')[0],
            responsibleName: `${data.name} ${data.lastName}`,
            schoolName: data.schoolName,
            visitorCount: data.visitorCount,
            status: 'pending' as 'pending',
            createdAt: new Date().toISOString(),
        };

        const appointmentsCollection = collection(firestore, 'appointments');
        const appointmentDocRef = await addDocumentNonBlocking(appointmentsCollection, newAppointment);
        
        const userProfile = {
            id: userId,
            name: data.name,
            lastName: data.lastName,
            dni: data.dni,
            phone: data.phone,
            email: data.email,
        };
        
        if (appointmentDocRef) {
          setDocumentNonBlocking(userRef, userProfile, { merge: true });
        }

        toast({
            title: 'Turno Reservado',
            description: 'Tu turno ha sido registrado. Recibirás una confirmación por correo electrónico.',
        });
        form.reset();
    } catch (error) {
        console.error('Error al guardar el turno:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo guardar el turno. Por favor, inténtalo de nuevo.',
        });
    }
}

  const isDataLoading = isScheduleLoading || areAppointmentsLoading;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Reserva de Turno para Visitas</CardTitle>
          <CardDescription>Completa el formulario para solicitar un turno de visita.</CardDescription>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <div className="flex justify-center items-center h-40">
                <p>Cargando configuración de turnos...</p>
            </div>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos de la Institución</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="schoolName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre de la escuela o institución</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Escuela N°1" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="visitorCount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cantidad de visitantes</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" max="70" placeholder="Ej: 25" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos del Responsable</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Juan" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Apellido</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Pérez" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="dni"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>DNI del responsable</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 30123456" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email de contacto</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="ejemplo@correo.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Teléfono de contacto</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: 1122334455" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Selección de Turno</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="appointmentDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Fecha de la visita</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP", { locale: es })
                                        ) : (
                                            <span>Selecciona una fecha</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => {
                                            if (isScheduleLoading) return false; // Don't disable while loading
                                            const dayKey = format(date, 'EEEE', { locale: es }).toLowerCase() as DayKey;
                                            return date < new Date(new Date().setHours(0,0,0,0)) || !scheduleConfig?.days[dayKey]?.enabled;
                                        }}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="appointmentSlot"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Horario disponible</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate || availableSlots.length === 0}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={!selectedDate ? "Selecciona una fecha primero" : "Selecciona un horario"} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableSlots.length > 0 ? (
                                            availableSlots.map((slot) => (
                                            <SelectItem key={slot.startTime} value={`${slot.startTime} - ${slot.endTime}`}>
                                                {slot.display}
                                            </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-slots" disabled>
                                                No hay horarios disponibles para esta fecha o cantidad de personas.
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

              <Button type="submit" className="w-full" disabled={isDataLoading}>Reservar Turno</Button>
            </form>
          </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
