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
import { useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Appointment, ScheduleConfiguration, DayKey, TimeSlot } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

// Schema de validación con el campo de fecha y hora
const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  lastName: z.string().min(1, 'El apellido es requerido.'),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres.'),
  schoolName: z.string().min(1, 'El nombre de la institución es requerido.'),
  visitorCount: z.coerce.number().min(1, 'Debe haber al menos 1 visitante.').max(70, 'El máximo es 70 visitantes.'),
  date: z.date({
    required_error: 'Se requiere una fecha para la visita.',
  }),
  timeSlot: z.string().min(1, 'Se requiere seleccionar un horario.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function TurnosPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  const scheduleRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'scheduleConfigurations', 'default') : null),
    [firestore]
  );

  const appointmentsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'appointments') : null),
    [firestore]
  );
  
  const { data: scheduleConfig, isLoading: isScheduleLoading } = useDoc<ScheduleConfiguration>(scheduleRef);
  const { data: allAppointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsCollectionRef);

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
      timeSlot: '',
    },
  });

  const selectedDate = form.watch('date');
  const visitorCount = form.watch('visitorCount');

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

    const appointmentsOnSelectedDate = (allAppointments || []).filter(
      (app) => app.date === format(selectedDate, 'yyyy-MM-dd')
    );

    const available = dayConfig.slots.filter((slot) => {
      const visitorsInSlot = appointmentsOnSelectedDate
        .filter((app) => app.startTime === slot.startTime)
        .reduce((sum, app) => sum + app.visitorCount, 0);
      
      const remainingCapacity = slot.capacity - visitorsInSlot;
      return remainingCapacity >= visitorCount;
    });

    setAvailableSlots(available);
    form.setValue('timeSlot', '');

  }, [selectedDate, visitorCount, scheduleConfig, allAppointments, areAppointmentsLoading, form]);


  async function onSubmit(data: FormValues) {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo conectar a la base de datos.' });
        return;
    }

    const selectedSlot = availableSlots.find(slot => slot.startTime === data.timeSlot);
    if (!selectedSlot) {
        toast({ variant: 'destructive', title: 'Error', description: 'El horario seleccionado ya no está disponible.' });
        return;
    }

    try {
        const userId = `user_${data.dni}_${Date.now()}`;
        const userRef = doc(firestore, 'users', userId);

        const newAppointmentRequest = {
            userId: userId,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            responsibleName: `${data.name} ${data.lastName}`,
            schoolName: data.schoolName,
            visitorCount: data.visitorCount,
            status: 'pending' as 'pending',
            createdAt: new Date().toISOString(),
        };

        const appointmentsCollection = collection(firestore, 'appointments');
        const appointmentDocRef = await addDocumentNonBlocking(appointmentsCollection, newAppointmentRequest);
        
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
            title: 'Solicitud de Turno Enviada',
            description: 'Hemos recibido tu solicitud. Nos pondremos en contacto para confirmar la visita.',
        });
        form.reset();
    } catch (error) {
        console.error('Error al guardar la solicitud de turno:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo enviar la solicitud. Por favor, inténtalo de nuevo.',
        });
    }
}

  const dayNamesInEnglish: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Solicitud de Turno para Visitas</CardTitle>
          <CardDescription>Completa tus datos y nos pondremos en contacto para coordinar la visita.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos de la Visita</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <FormField
                            control={form.control}
                            name="date"
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
                                            if (isScheduleLoading) return false;
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            if (date < today) return true;

                                            const dayKey = dayNamesInEnglish[date.getDay()];
                                            if (!scheduleConfig?.days[dayKey]?.enabled) {
                                                return true;
                                            }
                                            
                                            return false;
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
                            name="timeSlot"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Horario disponible</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate || availableSlots.length === 0}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un horario" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableSlots.map(slot => (
                                        <SelectItem key={slot.startTime} value={slot.startTime}>
                                            {`${slot.startTime} - ${slot.endTime}`}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                {!selectedDate && <p className="text-sm text-muted-foreground">Selecciona una fecha para ver los horarios.</p>}
                                {selectedDate && availableSlots.length === 0 && !areAppointmentsLoading && <p className="text-sm text-muted-foreground">No hay horarios disponibles para esta fecha o cantidad de personas.</p>}
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos del Responsable</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="flex flex-col md:flex-row gap-4">
                    <Button type="submit" className="w-full">Enviar Solicitud</Button>
                    <Link href="/" passHref className="w-full">
                        <Button variant="outline" className="w-full">Cancelar</Button>
                    </Link>
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
