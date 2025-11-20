
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Appointment, ScheduleConfiguration, DayKey, TimeSlot, mendozaDepartments } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PartyPopper } from 'lucide-react';
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
  schoolDepartment: z.string().min(1, 'Debe seleccionar un departamento.'),
  schoolEmail: z.string().min(1, { message: "El email de la institución es requerido." }).email('El email de la institución no es válido.'),
  higherAuthorityName: z.string().optional(),
  visitorCount: z.coerce.number().min(1, 'Debe haber al menos 1 alumno.').max(50, 'Para mas de 50 alumnos tiene que sacar otro turno'),
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
                <div className="space-y-4 text-muted-foreground prose-sm prose-p:my-2 prose-headings:my-4 max-h-[60vh] overflow-y-auto pr-4">
                    <h3 className="text-lg font-semibold text-foreground">Programa de Turismo Educativo 2026: “Un viaje a la naturaleza y la historia de Los Chacayes”</h3>
                    <p>Estimada/o docente,</p>
                    <p>Desde la Dirección de Turismo de Tunuyán, nos complace presentarles nuestro Programa de Turismo Educativo: "Un viaje a la naturaleza y la historia de Los Chacayes". Una experiencia diseñada para enriquecer el aprendizaje de sus estudiantes y conectar con el valioso patrimonio de nuestra región.</p>
                    <p>Esta aventura tiene una duración de una hora y treinta minutos aproximadamente. Se inicia con el encuentro con uno de nuestros guías en el ingreso al Museo Retorno a la Patria, continuando luego al Museo Arqueológico y de Ciencias Naturales (o viceversa). La experiencia prosigue con una visita al Monumento Retorno a la Patria, donde se realizará una foto grupal, y culmina en el icónico Árbol Histórico Manzano de Tunuyán.</p>
                    <p>El programa incluye, además, el acceso gratuito y por el día (sin pernocte) al Camping Municipal para diversas actividades recreativas, siempre solicitando el cuidado de las instalaciones y el mantenimiento del orden y la limpieza.</p>
                    <div>
                        <h4 className="font-semibold text-foreground">Costo del Programa:</h4>
                        <p>El Programa tiene un valor de 60 U.T.M. por persona. Esto equivale a un total de $6000 ($100 por U.T.M.).</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Cómo concretar su visita:</h4>
                        <p>Para asegurar una organización eficiente y una experiencia inolvidable, les pedimos seguir estos sencillos pasos:</p>
                        <ol className="list-decimal pl-5 mt-2 space-y-1">
                            <li>Consultar y elegir la fecha y hora en el siguiente paso.</li>
                            <li>Completar el formulario de reserva.</li>
                            <li>Realizar el pago: Tras la recepción y aceptación de su formulario, le indicaremos cómo proceder con el abono del programa.</li>
                            <li>Coordinar el transporte: Contrate el servicio de transporte que los conducirá hasta el Paraje Manzano Histórico.</li>
                        </ol>
                         <p className="mt-2">El día de la visita, nuestro equipo de guías los estará esperando en la puerta de los museos para iniciar esta fascinante experiencia.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-foreground">Solicitud de Descuentos:</h4>
                        <p>Entendemos que, en ocasiones, algunos estudiantes podrían tener dificultades para afrontar el costo del programa. Si este fuera el caso, les sugerimos redactar una nota en formato PDF, con membrete de la escuela dirigida al Sr. Intendente Municipal, Profesor José Emir Andraos, solicitando la exención del pago de aquellos alumnos que no puedan solventar el programa. Por favor, envíe esta nota al correo desarrolloturísticotunuyan@gmail.com.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-foreground">Recomendaciones importantes para la visita a los museos:</h4>
                        <p>Para garantizar una experiencia óptima y fluida dentro de los museos, y para la conservación de nuestro patrimonio, les solicitamos amablemente tener en cuenta lo siguiente:</p>
                        <ul className="list-none mt-2 space-y-1">
                            <li>🚫 No fumar.</li>
                            <li>🚫 No ingresar ni consumir dentro de los edificios ningún tipo de alimentos o bebidas (agua, mate, gaseosas, golosinas, sándwiches, etc.).</li>
                            <li>🚫 No ingresar con pelotas, palos u otro objeto que pueda dañar las exhibiciones.</li>
                            <li>🚫 No ingresar con animales, salvo los de compañía para personas con discapacidad.</li>
                            <li>🎒 Los bolsos o mochilas deben llevarse en la mano o por delante.</li>
                            <li>📸 Se permite tomar fotografías, pero sin el uso del flash.</li>
                            <li>👥 Para una mejor organización y disfrute, solicitamos que los grupos se organicen en subgrupos de no más de 20 (veinte) personas.</li>
                        </ul>
                    </div>
                    <p>Cualquier inquietud adicional, no dude en comunicarse con nosotros al 2622-413102 desde las 09:00 a las 13:30 horas.</p>
                    <p>Agradecemos nuevamente por elegir nuestro programa educativo y estamos seguros de que disfrutarán de esta enriquecedora experiencia en la historia y la naturaleza de Los Chacayes.</p>
                    <p className="font-semibold">Saludos cordiales,<br />Dirección de Turismo de Tunuyán</p>
                </div>
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

function SuccessStep({ appointmentId, onReset }: { appointmentId: string, onReset: () => void }) {
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
                <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                    <PartyPopper className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl md:text-3xl mt-4">¡Solicitud Enviada con Éxito!</CardTitle>
                <CardDescription>
                    Hemos recibido tu solicitud de turno. Nos pondremos en contacto a la brevedad para confirmar todos los detalles.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-lg">Tu número de referencia de turno es:</p>
                <p className="text-4xl font-bold tracking-wider bg-muted rounded-md p-4 my-2">{appointmentId}</p>
                <p className="text-sm text-muted-foreground mt-4">Por favor, guarda este número para futuras consultas.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button onClick={onReset}>Solicitar Otro Turno</Button>
            </CardFooter>
        </Card>
    );
}


export default function TurnosPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [step, setStep] = useState<'terms' | 'form' | 'success'>('terms');
  const [submittedAppointmentId, setSubmittedAppointmentId] = useState<string | null>(null);

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
      schoolDepartment: '',
      schoolEmail: '',
      higherAuthorityName: '',
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

        const newAppointmentRequest: Omit<Appointment, 'id'> = {
            userId: userId,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            responsibleName: `${data.name} ${data.lastName}`,
            schoolName: data.schoolName,
            schoolDepartment: data.schoolDepartment,
            schoolEmail: data.schoolEmail,
            higherAuthorityName: data.higherAuthorityName || '',
            visitorCount: data.visitorCount,
            status: 'pending' as 'pending',
            paid: false,
            createdAt: new Date().toISOString(),
        };

        const appointmentsCollection = collection(firestore, 'appointments');
        // Await the promise to get the document reference
        const appointmentDocRef = await addDocumentNonBlocking(appointmentsCollection, newAppointmentRequest);
        
        if (appointmentDocRef) {
          const userProfile = {
              id: userId,
              name: data.name,
              lastName: data.lastName,
              dni: data.dni,
              phone: data.phone,
              email: data.email,
          };
          setDocumentNonBlocking(userRef, userProfile, { merge: true });
          
          // Set the ID and change the step to 'success'
          setSubmittedAppointmentId(appointmentDocRef.id);
          setStep('success');
        } else {
             throw new Error("No se pudo obtener la referencia del documento del turno.");
        }

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
  
  const handleReset = () => {
    form.reset();
    setSubmittedAppointmentId(null);
    setStep('terms');
  }

  if (step === 'terms') {
      return (
          <div className="container mx-auto p-4 md:p-8">
              <TermsAndConditionsStep onAccepted={() => setStep('form')} />
          </div>
      );
  }

  if (step === 'success' && submittedAppointmentId) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <SuccessStep appointmentId={submittedAppointmentId} onReset={handleReset} />
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
            <p className="text-destructive font-bold mt-2">
                El tiempo límite de tolerancia es de 10 minutos, por favor no comprometa al personal.
            </p>
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
                            name="visitorCount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cantidad de alumnos</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" max="50" placeholder="Ej: 25" {...field} />
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
                         <FormField
                            control={form.control}
                            name="schoolDepartment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Departamento de la institución</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un departamento" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {mendozaDepartments.map(dep => (
                                                <SelectItem key={dep} value={dep}>
                                                    {dep}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                            name="higherAuthorityName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Nombre de Autoridad Superior</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Directora Ana María" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Datos del Responsable de la salida</h3>
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

    