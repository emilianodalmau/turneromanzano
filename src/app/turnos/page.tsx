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
import { useFirestore, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Appointment, ScheduleConfiguration, DayKey, TimeSlot, mendozaDepartments, School } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PartyPopper, Copy, AlertCircle, Upload, FileCheck, Loader2, Search, ChevronsUpDown, Check } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn, generateReadableId } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { uploadFile } from '@/firebase/client-storage';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

// --- ZOD SCHEMAS ---
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

const uploadSchema = z.object({
    referenceId: z.string().min(8, 'El número de referencia no es válido.'),
    paymentProof: z.instanceof(File, { message: 'Se requiere el archivo del comprobante.' })
        .refine(file => file.size < 5 * 1024 * 1024, 'El archivo no debe exceder los 5MB.')
});

type FormValues = z.infer<typeof formSchema>;
type UploadValues = z.infer<typeof uploadSchema>;

function InitialStep({ onSelectOption }: { onSelectOption: (option: 'new' | 'upload' | 'check_status') => void }) {
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl md:text-3xl text-center">Gestión de Turnos para el Museo</CardTitle>
                <CardDescription className="text-center pt-2">
                    ¿Qué deseas hacer?
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
                <Button onClick={() => onSelectOption('new')} variant="default" className="h-16 text-lg">
                    Solicitar un Nuevo Turno
                </Button>
                <Button onClick={() => onSelectOption('upload')} variant="outline" className="h-16 text-lg">
                    Subir Comprobante de Pago
                </Button>
                 <Button onClick={() => onSelectOption('check_status')} variant="secondary" className="h-16 text-lg">
                    Consultar Turno
                </Button>
            </CardContent>
             <CardFooter>
                <Link href="/" className="w-full">
                    <Button variant="link" className="w-full">Volver a la página principal</Button>
                </Link>
            </CardFooter>
        </Card>
    );
}

function TermsAndConditionsStep({ onAccepted, onBack }: { onAccepted: () => void, onBack: () => void }) {
    const [accepted, setAccepted] = useState(false);
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">Aceptación de condiciones y términos que emanan del Programa de Turismo Educativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-4 text-muted-foreground prose-sm prose-p:my-2 prose-headings:my-4 max-h-[60vh] overflow-y-auto pr-4">
                    <h3 className="text-lg font-semibold text-foreground">Programa de Turismo Educativo 2026: "Un viaje a la naturaleza y la historia de Los Chacayes"</h3>
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
                <div className="flex justify-between gap-4">
                     <Button variant="outline" onClick={onBack}>Volver</Button>
                    <Button onClick={onAccepted} disabled={!accepted}>
                        Siguiente
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function SuccessStep({ referenceId, onReset }: { referenceId: string, onReset: () => void }) {
    const { toast } = useToast();
    const cbu = '19103215-55032100256696';
    const handleCopyCbu = () => {
        navigator.clipboard.writeText(cbu).then(() => {
            toast({
                title: 'CBU copiado',
                description: 'El CBU ha sido copiado a tu portapapeles.',
            });
        }).catch(err => {
            console.error('Failed to copy CBU: ', err);
            toast({
                variant: 'destructive',
                title: 'Error al copiar',
                description: 'No se pudo copiar el CBU.',
            });
        });
    };
    
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
                <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                    <PartyPopper className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl md:text-3xl mt-4">¡Solicitud Enviada con Éxito!</CardTitle>
                <CardDescription>
                    Hemos recibido tu solicitud de turno. Para confirmar la reserva, por favor, realiza el pago.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div>
                    <p className="text-lg">Tu número de referencia de turno es:</p>
                    <p className="text-4xl font-bold tracking-wider bg-muted rounded-md p-4 my-2">{referenceId}</p>
                     <Alert variant="destructive" className="mt-4 text-left">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-bold">Importante</AlertTitle>
                        <AlertDescription>
                          Por favor, guarda este número para poder subir el comprobante de pago.
                        </AlertDescription>
                    </Alert>
                </div>
                
                <Separator />
                <div className="text-left space-y-4">
                    <h4 className="font-semibold text-lg text-center">Datos para el Pago</h4>
                    <p className="text-muted-foreground">
                        Para confirmar tu reserva, realiza la transferencia o depósito al siguiente CBU. Una vez realizado el pago, vuelve a esta página y selecciona "Subir Comprobante de Pago".
                    </p>
                    <div>
                        <p className="text-sm font-medium">CBU:</p>
                        <div className="flex items-center gap-4 p-3 bg-muted rounded-md">
                            <p className="text-lg font-mono break-all flex-1">{cbu}</p>
                            <Button variant="outline" size="icon" onClick={handleCopyCbu}>
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">Copiar CBU</span>
                            </Button>
                        </div>
                    </div>
                     <p className="text-sm text-muted-foreground">Alias: <span className="font-semibold text-foreground">Municipalidad.Tunuyan.Tur</span></p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button onClick={onReset}>Solicitar Otro Turno</Button>
            </CardFooter>
        </Card>
    );
}

function UploadProofStep({ onBack, onUploadSuccess }: { onBack: () => void, onUploadSuccess: (referenceId: string) => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const form = useForm<UploadValues>({ 
        resolver: zodResolver(uploadSchema),
        defaultValues: {
            referenceId: '',
            paymentProof: undefined,
        }
    });
    const { isSubmitting } = form.formState;
    async function onSubmit(data: UploadValues) {
        if (!firestore) {
            toast({ title: "Error", description: "No se pudo conectar a la base de datos.", variant: "destructive" });
            return;
        }
        try {
            const appointmentsCollection = collection(firestore, 'appointments');
            const q = query(appointmentsCollection, where("referenceId", "==", data.referenceId), limit(1));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                form.setError("referenceId", { type: "manual", message: "No se encontró ningún turno con ese número de referencia." });
                return;
            }
            const appointmentDoc = querySnapshot.docs[0];
            const filePath = `comprobantesPago/${appointmentDoc.id}/${data.paymentProof.name}`;
            
            const downloadURL = await uploadFile(data.paymentProof, filePath);
            
            const appointmentRef = doc(firestore, 'appointments', appointmentDoc.id);
            updateDocumentNonBlocking(appointmentRef, { paymentProofUrl: downloadURL });
            onUploadSuccess(data.referenceId);
        } catch (error) {
            console.error("Client-side upload error:", error);
            toast({
                title: "Error al subir",
                description: "Ocurrió un problema al subir el archivo. Por favor, inténtalo de nuevo.",
                variant: "destructive"
            });
        }
    }
    return (
         <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">Subir Comprobante de Pago</CardTitle>
                <CardDescription>
                    Ingresa tu número de referencia y adjunta el comprobante de pago para confirmar tu turno.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="referenceId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Referencia</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: aB3x-8fG1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentProof"
                            render={({ field: { onChange, value, ...rest } }) => (
                                <FormItem>
                                    <FormLabel>Archivo del Comprobante</FormLabel>
                                    <FormControl>
                                       <Input type="file" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-between gap-4">
                            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                                Volver
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Subiendo...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Subir Comprobante
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function UploadSuccessStep({ referenceId, onReset }: { referenceId: string, onReset: () => void }) {
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
                <div className="mx-auto bg-green-100 rounded-full h-16 w-16 flex items-center justify-center">
                    <FileCheck className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl md:text-3xl mt-4">¡Comprobante Subido!</CardTitle>
                <CardDescription>
                    Recibimos tu comprobante para el turno <span className="font-bold">{referenceId}</span>. Lo verificaremos a la brevedad.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>Tu turno será confirmado una vez que el pago sea verificado por nuestro equipo. Recibirás una notificación por correo electrónico.</p>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button onClick={onReset}>Volver al Inicio</Button>
            </CardFooter>
        </Card>
    );
}

function CheckStatusStep({ onBack }: { onBack: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [referenceId, setReferenceId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [notFound, setNotFound] = useState(false);
    const handleSearch = async () => {
        if (!firestore || !referenceId) {
            toast({ title: "Error", description: "Por favor, ingresa un número de referencia.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setAppointment(null);
        setNotFound(false);
        try {
            const appointmentsCollection = collection(firestore, 'appointments');
            const q = query(appointmentsCollection, where("referenceId", "==", referenceId), limit(1));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setNotFound(true);
            } else {
                const appData = querySnapshot.docs[0].data() as Appointment;
                setAppointment(appData);
            }
        } catch (error) {
            console.error("Error searching appointment:", error);
            toast({ title: "Error", description: "No se pudo realizar la búsqueda. Inténtalo de nuevo.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const getStatusVariant = (status: Appointment['status']) => {
        switch (status) {
            case 'pending': return 'secondary';
            case 'confirmed': return 'default';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl md:text-3xl">Consultar Estado del Turno</CardTitle>
                <CardDescription>
                    Ingresa tu número de referencia para ver los detalles y el estado de tu turno.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex w-full items-center space-x-2">
                    <Input
                        type="text"
                        placeholder="Ej: aB3x-8fG1"
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        <span className="ml-2">Buscar</span>
                    </Button>
                </div>
                {notFound && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No Encontrado</AlertTitle>
                        <AlertDescription>
                            No se encontró ningún turno con ese número de referencia. Por favor, verifica que lo hayas escrito correctamente.
                        </AlertDescription>
                    </Alert>
                )}
                {appointment && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles del Turno: {appointment.referenceId}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between"><span>Institución:</span> <span className="font-semibold">{appointment.schoolName}</span></div>
                            <div className="flex justify-between"><span>Responsable:</span> <span className="font-semibold">{appointment.responsibleName}</span></div>
                            <div className="flex justify-between"><span>Fecha:</span> <span className="font-semibold">{format(new Date(appointment.date + 'T00:00:00'), "dd/MM/yyyy")}</span></div>
                            <div className="flex justify-between"><span>Horario:</span> <span className="font-semibold">{appointment.startTime}</span></div>
                            <Separator />
                            <div className="flex justify-between items-center">
                                <span>Estado del Turno:</span>
                                <Badge variant={getStatusVariant(appointment.status)} className="text-sm">
                                    {appointment.status === 'pending' ? 'Pendiente' : appointment.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Estado del Pago:</span>
                                <Badge variant={appointment.paid ? 'default' : 'secondary'} className="text-sm">
                                    {appointment.paid ? 'Pagado' : 'Pendiente de Pago'}
                                </Badge>
                            </div>
                             {appointment.paymentProofUrl && (
                                <Alert className="mt-4">
                                    <FileCheck className="h-4 w-4" />
                                    <AlertTitle>Comprobante Cargado</AlertTitle>
                                    <AlertDescription>
                                        Ya has subido un comprobante de pago. Está pendiente de verificación.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}
            </CardContent>
            <CardFooter>
                 <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
                    Volver
                </Button>
            </CardFooter>
        </Card>
    );
}

const dayNamesInEnglish: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function SchoolCombobox({ field, form, schools, isLoading }: { field: any, form: any, schools: School[], isLoading: boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                        )}
                    >
                        {field.value
                            ? schools.find(
                                (school) => school.name === field.value
                            )?.name
                            : "Selecciona una institución"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command>
                    <CommandInput placeholder="Buscar institución..." />
                    <CommandList>
                        {isLoading ? (
                            <div className="p-4 text-sm text-center text-muted-foreground">Cargando escuelas...</div>
                        ) : (
                            <>
                                <CommandEmpty>No se encontró la institución.</CommandEmpty>
                                <CommandGroup>
                                    {schools.map((school) => (
                                        <CommandItem
                                            value={school.name}
                                            key={school.id}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onSelect={() => {
                                                form.setValue("schoolName", school.name, { shouldValidate: true });
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    school.name === field.value
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                            {school.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function TurnosPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [step, setStep] = useState<'initial' | 'terms' | 'form' | 'success' | 'upload' | 'upload_success' | 'check_status'>('initial');
  const [submittedReferenceId, setSubmittedReferenceId] = useState<string | null>(null);

  const scheduleRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'scheduleConfigurations', 'default') : null),
    [firestore]
  );
  const appointmentsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'appointments') : null),
    [firestore]
  );
  
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'schools'), orderBy('name')) : null),
    [firestore]
  );

  const { data: scheduleConfig, isLoading: isScheduleLoading } = useDoc<ScheduleConfiguration>(scheduleRef);
  const { data: allAppointments, isLoading: areAppointmentsLoading } = useCollection<Appointment>(appointmentsCollectionRef);
  const { data: schools, isLoading: isLoadingSchools } = useCollection<School>(schoolsQuery);

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
  }, [selectedDate, scheduleConfig, allAppointments, areAppointmentsLoading]);

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
        const guestId = `guest_${data.dni}_${Date.now()}`;
        const guestRef = doc(firestore, 'guests', guestId);
        const referenceId = generateReadableId();
        const newAppointmentRequest: Omit<Appointment, 'id' | 'paymentProofUrl'> = {
            guestId: guestId,
            referenceId: referenceId,
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
        const appointmentDocRef = await addDocumentNonBlocking(appointmentsCollection, newAppointmentRequest);
        
        if (appointmentDocRef) {
          const guestProfile = {
              id: guestId,
              name: data.name,
              lastName: data.lastName,
              dni: data.dni,
              phone: data.phone,
              email: data.email,
          };
          setDocumentNonBlocking(guestRef, guestProfile, { merge: true });
          
          setSubmittedReferenceId(referenceId);
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
  
  const handleReset = () => {
    form.reset();
    setSubmittedReferenceId(null);
    setStep('initial');
  }
  
  const handleSelectOption = (option: 'new' | 'upload' | 'check_status') => {
    if (option === 'new') {
        setStep('terms');
    } else if (option === 'upload') {
        setStep('upload');
    } else {
        setStep('check_status');
    }
  };

  const handleUploadSuccess = (referenceId: string) => {
    setSubmittedReferenceId(referenceId);
    setStep('upload_success');
  }

  const renderStep = () => {
    switch (step) {
        case 'initial':
            return <InitialStep onSelectOption={handleSelectOption} />;
        case 'terms':
            return <TermsAndConditionsStep onAccepted={() => setStep('form')} onBack={() => setStep('initial')} />;
        case 'upload':
            return <UploadProofStep onBack={() => setStep('initial')} onUploadSuccess={handleUploadSuccess} />;
        case 'upload_success':
             return <UploadSuccessStep referenceId={submittedReferenceId!} onReset={handleReset} />;
        case 'success':
            return <SuccessStep referenceId={submittedReferenceId!} onReset={handleReset} />;
        case 'check_status':
            return <CheckStatusStep onBack={() => setStep('initial')} />;
        case 'form':
            return (
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
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Nombre de la escuela o institución</FormLabel>
                                            <SchoolCombobox field={field} form={form} schools={schools || []} isLoading={isLoadingSchools} />
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
            );
        default:
            return null;
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
        {renderStep()}
    </div>
  );
}
