
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
import { Checkbox } from '@/components/ui/checkbox';

// Schema de validación con el campo de fecha y hora
const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  lastName: z.string().min(1, 'El apellido es requerido.'),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres.'),
  schoolName: z.string().min(1, 'El nombre de la institución es requerido.'),
  schoolEmail: z.string().min(1, { message: "El email de la institución es requerido." }).email('El email de la institución no es válido.'),
  visitorCount: z.coerce.number().min(1, 'Debe haber al menos 1 visitante.').max(70, 'El máximo es 70 visitantes.'),
  date: z.date({
    required_error: 'Se requiere una fecha para la visita.',
  }),
  timeSlot: z.string().min(1, 'Se requiere seleccionar un horario.'),
});

type FormValues = z.infer<typeof formSchema>;

function TermsAndConditionsStep({ onAccepted }: { onAccepted: () => void }) {
    const [accepted, setAccepted] = useState(false);

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">Aceptación de condiciones y términos que emanan del Programa de Turismo Educativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                    El Programa de Turismo Educativo en Argentina tiene como objetivo que los estudiantes de todas las escuelas, especialmente aquellos de sectores vulnerables, conozcan y comprendan la diversidad geográfica y cultural del país. Este programa incluye actividades sociorecreativas y formativas, y se implementa con el apoyo de los Ministerios de Educación y Turismo de la Nación.
                </p>
                <div className="space-y-2 text-muted-foreground">
                    <p>Las condiciones y términos del programa incluyen:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><span className="font-semibold">Certificación de Agencias:</span> Las agencias de viajes deben contar con un "Certificado Nacional de Autorización para Agencias de Turismo Estudiantil".</li>
                        <li><span className="font-semibold">Requisitos para Organizadores:</span> Las agencias deben cumplir con ciertos requisitos de seguridad y calidad en los viajes educativos.</li>
                        <li><span className="font-semibold">Protección al Estudiante:</span> Se establecen medidas para garantizar la seguridad y el bienestar de los estudiantes durante sus viajes.</li>
                        <li><span className="font-semibold">Promoción del Turismo Interno:</span> El programa fomenta el conocimiento y aprecio por los destinos turísticos de Argentina.</li>
                    </ul>
                </div>
                <p className="text-muted-foreground">
                    Este programa busca no solo ofrecer experiencias educativas, sino también promover la inclusión y el respeto por la diversidad cultural.
                </p>

                <div className="flex items-center space-x-2 pt-4">
                    <Checkbox id="terms" checked={accepted} onCheckedChange={(checked) => setAccepted(checked as boolean)} />
                    <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Acepto las condiciones
                    </label>
                </div>

                <div className="flex justify-end gap-4">
                     <Link href="/" passHref>
                        <Button variant="outline">Cancelar</Button>
                    </Link>
                    <Button onClick={onAccepted} disabled={!accepted}>
                        Siguiente
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


export default function TurnosPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [step, setStep] = useState<'terms' | 'form'>('terms');

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
      schoolEmail: '',
      visitorCount: 1,
      timeSlot: '',
    },
  });

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
    
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    if (scheduleConfig.blockedDates?.includes(dateString)) {
        setAvailableSlots([]);
        return;
    }

    const appointmentsOnSelectedDate = (allAppointments || []).filter(
      (app) => app.date === format(selectedDate, 'yyyy-MM-dd')
    );

    const available = dayConfig.slots.filter((slot) => {
      const appointmentsInSlot = appointmentsOnSelectedDate.filter(
        (app) => app.startTime === slot.startTime
      ).length;
      
      return appointmentsInSlot < slot.capacity;
    });

    setAvailableSlots(available);

  }, [selectedDate, scheduleConfig, allAppointments, areAppointmentsLoading, form]);


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
            schoolEmail: data.schoolEmail,
            visitorCount: data.visitorCount,
            status: 'pending' as 'pending',
            paid: false,
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
        setStep('terms'); // Go back to terms after submission
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
  
  if (step === 'terms') {
      return (
          <div className="container mx-auto p-4 md:p-8">
              <TermsAndConditionsStep onAccepted={() => setStep('form')} />
          </div>
      );
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Programa de Turismo Educativo 2026</CardTitle>
          <CardDescription>
            <p className="font-bold">Leer atentamente:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-2">
                <li>El Programa de Turismo Educativo 2026 es a partir de los 8 años.</li>
                <li>La visita es guiada por el Parque Temático Sanmartiniano.</li>
                <li>El máximo de alumnos es de 50 en total por turno.</li>
                <li>Con la posibilidad de llevar hasta 6 acompañantes.</li>
            </ul>
          </CardDescription>
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
                            name="schoolEmail"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email de la institución</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="contacto@escuela.com" {...field} />
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
                                            if (isScheduleLoading) return true;
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            if (date < today) return true;

                                            // Check if the date is in the blocked dates list
                                            const dateString = format(date, 'yyyy-MM-dd');
                                            if (scheduleConfig?.blockedDates?.includes(dateString)) {
                                                return true;
                                            }

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
                                {selectedDate && availableSlots.length === 0 && !areAppointmentsLoading && <p className="text-sm text-muted-foreground">No hay horarios disponibles para esta fecha.</p>}
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
                     <Button type="button" variant="outline" className="w-full" onClick={() => setStep('terms')}>Volver</Button>
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
