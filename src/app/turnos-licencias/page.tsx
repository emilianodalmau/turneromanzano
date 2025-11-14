'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, ControllerRenderProps } from 'react-hook-form';
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
import { collection, doc } from 'firebase/firestore';
import { LicenseAppointment, LicenseScheduleConfiguration, DayKey, TimeSlot, procedureTypes, DocumentRequirement } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, CalendarIcon, ChevronLeft, ChevronRight, Upload, Link as LinkIcon, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { uploadFile } from '@/firebase/storage';

// --- ZOD SCHEMA ---
const fileSchema = z.instanceof(File, { message: 'Se requiere el archivo.' }).optional();

// Construye un esquema de Zod dinámicamente para los documentos
const documentsSchema = z.object(
  procedureTypes.reduce((acc, procedure) => {
    procedure.docs.forEach(docOrCategory => {
      if ('category' in docOrCategory) {
        docOrCategory.docs.forEach(doc => {
          if (!doc.isLink) {
             // Solo añade al esquema si no es opcional
            if (!doc.optional) {
              acc[doc.id] = z.instanceof(File, { message: `Se requiere ${doc.label}.` });
            } else {
              acc[doc.id] = fileSchema;
            }
          }
        });
      } else {
        if (!docOrCategory.isLink) {
           if (!docOrCategory.optional) {
            acc[docOrCategory.id] = z.instanceof(File, { message: `Se requiere ${docOrCategory.label}.` });
          } else {
            acc[docOrCategory.id] = fileSchema;
          }
        }
      }
    });
    return acc;
  }, {} as Record<string, z.ZodTypeAny>)
).optional();


const formSchema = z.object({
  // Step 1
  date: z.date({ required_error: 'Se requiere una fecha para el turno.' }),
  timeSlot: z.string().min(1, 'Se requiere seleccionar un horario.'),
  
  // Step 2
  name: z.string().min(1, 'El nombre es requerido.'),
  lastName: z.string().min(1, 'El apellido es requerido.'),
  email: z.string().email('Correo electrónico no válido.'),
  phone: z.string().min(1, 'El teléfono es requerido.'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 caracteres.'),
  
  // Step 3
  procedureType: z.string().min(1, 'Se requiere seleccionar un tipo de trámite.'),
  documents: documentsSchema,
});

type FormValues = z.infer<typeof formSchema>;

const dayNamesInEnglish: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


// --- FILE INPUT COMPONENT ---
const FileInput = React.forwardRef<
  HTMLInputElement,
  {
    value?: File | null;
    onChange: (file: File | null) => void;
    name: string;
    onBlur: () => void;
  }
>(({ value, onChange, name, onBlur }, ref) => {
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    setFileName(value?.name || null);
  }, [value]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onChange(file); // Pass the file object to react-hook-form
    } else {
      setFileName(null);
      onChange(null);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor={name}
        className="flex-1 cursor-pointer"
      >
        <div className="flex items-center justify-center w-full px-4 py-2 text-sm border rounded-md hover:bg-muted">
          <Upload className="w-4 h-4 mr-2" />
          <span>{fileName ? 'Cambiar archivo' : 'Seleccionar archivo'}</span>
        </div>
        <input
          id={name}
          type="file"
          className="sr-only"
          ref={ref}
          name={name}
          onBlur={onBlur}
          onChange={handleFileChange}
        />
      </label>
      {fileName && (
        <div className="flex items-center text-sm text-green-600">
          <FileText className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate max-w-[150px]">{fileName}</span>
        </div>
      )}
    </div>
  );
});
FileInput.displayName = "FileInput";


// --- DOCUMENTS FORM SECTION ---
function DocumentsFormSection({ control }: { control: any }) {
    const procedureTypeId = useWatch({ control, name: 'procedureType' });

    const selectedProcedure = useMemo(
        () => procedureTypes.find((p) => p.id === procedureTypeId),
        [procedureTypeId]
    );
    
    const renderField = (doc: DocumentRequirement) => {
        if (doc.isLink) {
             return (
                <div key={doc.id} className="space-y-2">
                     <div className="flex items-center justify-between">
                        <FormLabel>{doc.label}</FormLabel>
                        <Link href={doc.href || '#'} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Ir al sitio
                            </Button>
                        </Link>
                    </div>
                     {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}
                </div>
            );
        }

        return (
            <FormField
                key={doc.id}
                control={control}
                name={`documents.${doc.id}` as any}
                render={({ field }) => (
                    <FormItem>
                         <div className="flex items-center justify-between">
                            <FormLabel>{doc.label} {doc.optional && <span className="text-xs text-muted-foreground">(Opcional)</span>}</FormLabel>
                         </div>
                        <FormControl>
                           <FileInput {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    }
    
    if (!selectedProcedure) {
        return <p className="text-sm text-muted-foreground">Selecciona un tipo de trámite para ver los documentos requeridos.</p>;
    }

    return (
        <div className="space-y-6">
            {selectedProcedure.docs.map((item, index) => {
                if ('category' in item) {
                    return (
                        <div key={index} className="p-4 border rounded-lg space-y-4">
                            <h4 className="font-semibold text-md">{item.category}</h4>
                            {item.docs.map(renderField)}
                        </div>
                    );
                }
                return renderField(item);
            })}
        </div>
    );
}

// --- MAIN PAGE COMPONENT ---
export default function TurnosLicenciasPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scheduleRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'licenseScheduleConfigurations', 'default') : null),
    [firestore]
  );
  
  const appointmentsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'licenseAppointments') : null),
    [firestore]
  );
  
  const { data: scheduleConfig, isLoading: isScheduleLoading } = useDoc<LicenseScheduleConfiguration>(scheduleRef);
  const { data: allAppointments, isLoading: areAppointmentsLoading } = useCollection<LicenseAppointment>(appointmentsCollectionRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      lastName: '',
      email: '',
      phone: '',
      dni: '',
      procedureType: '',
      timeSlot: '',
      documents: {},
    },
  });

  const selectedDate = form.watch('date');
  const procedureType = form.watch('procedureType');

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
      const appointmentsInSlot = appointmentsOnSelectedDate.filter(
        (app) => app.startTime === slot.startTime
      ).length;
      return appointmentsInSlot < slot.capacity;
    });

    setAvailableSlots(available);
    form.setValue('timeSlot', '');
    
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
    setIsSubmitting(true);

    try {
        const userId = `user_${data.dni}_${Date.now()}`;
        const userRef = doc(firestore, 'users', userId);

        const uploadedDocuments: Record<string, string> = {};
        if (data.documents) {
            for (const docId in data.documents) {
                const file = data.documents[docId as keyof typeof data.documents];
                if (file instanceof File) {
                    const filePath = `license-documents/${userId}/${procedureType}/${file.name}`;
                    const downloadURL = await uploadFile(file, filePath);
                    uploadedDocuments[docId] = downloadURL;
                }
            }
        }

        const newAppointmentRequest = {
            userId: userId,
            date: format(data.date, 'yyyy-MM-dd'),
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            procedureType: procedureTypes.find(p => p.id === data.procedureType)?.name || data.procedureType,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            documents: uploadedDocuments,
        };

        const appointmentsCollection = collection(firestore, 'licenseAppointments');
        const appointmentDocRef = await addDocumentNonBlocking(appointmentsCollection, newAppointmentRequest);
        
        const userProfile = {
            id: userId,
            name: data.name,
            lastName: data.lastName,
            dni: data.dni,
            phone: data.phone,
            email: data.email,
            role: 'license_admin' as const,
        };
        
        if (appointmentDocRef) {
          setDocumentNonBlocking(userRef, userProfile, { merge: true });
        }

        toast({
            title: 'Solicitud de Turno Enviada',
            description: 'Hemos recibido tu solicitud. Recuerda cumplir con los requisitos informados.',
        });
        form.reset();
        setCurrentStep(0);
    } catch (error) {
        console.error('Error al guardar la solicitud de turno:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo enviar la solicitud. Por favor, inténtalo de nuevo.',
        });
    } finally {
        setIsSubmitting(false);
    }
}

  const steps = [
    { name: 'Turno', fields: ['date', 'timeSlot'] as const },
    { name: 'Datos Personales', fields: ['name', 'lastName', 'email', 'phone', 'dni'] as const },
    { name: 'Trámite y Documentos', fields: ['procedureType', 'documents'] as const },
  ];

  const nextStep = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    const isValid = await form.trigger(fieldsToValidate);

    // Special validation for documents on step 3
    if (currentStep === 2 && procedureType) {
        const selectedProcedure = procedureTypes.find(p => p.id === procedureType);
        if (selectedProcedure) {
            let allDocsValid = true;
            const checkDocs = (docs: (DocumentRequirement | {category: string, docs: DocumentRequirement[]})[]) => {
                for (const item of docs) {
                    if ('category' in item) {
                        checkDocs(item.docs);
                    } else if (!item.optional && !item.isLink) {
                        const docFile = form.getValues(`documents.${item.id}` as any);
                        if (!docFile) {
                            form.setError(`documents.${item.id}` as any, { type: 'required', message: `Se requiere ${item.label}.` });
                            allDocsValid = false;
                        }
                    }
                }
            }
            checkDocs(selectedProcedure.docs);
            if (!allDocsValid) return;
        }
    }


    if (isValid) {
      setCurrentStep(s => Math.min(s + 1, steps.length - 1));
    }
  };

  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Solicitud de Turno para Licencia de Conducir</CardTitle>
          <CardDescription>Completa el formulario para solicitar tu turno. Asegúrate de conocer los requisitos para tu trámite.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4 mb-8">
                 <Progress value={(currentStep + 1) / steps.length * 100} className="w-full" />
                 <p className="text-sm text-center text-muted-foreground">Paso {currentStep + 1} de {steps.length}: {steps[currentStep].name}</p>
            </div>

            {currentStep === 0 && (
                <div className="space-y-4 mb-8">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-bold">RECUERDE</AlertTitle>
                        <AlertDescription>
                            Solo podrán realizar el trámite las personas que posean domicilio en el departamento de Tunuyán y con el último ejemplar de su D.N.I.
                        </AlertDescription>
                    </Alert>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-bold">INFORMACIÓN IMPORTANTE - LEY 24449 - ARTÍCULO 18</AlertTitle>
                        <AlertDescription>
                            Todo ciudadano que realice modificaciones de Datos en su DOCUMENTO NACIONAL DE IDENTIDAD debe actualizar los mismos en su licencia de conducir, en un plazo no superior a 90 DÍAS de realizada la edición del mismo. La licencia CADUCA A LOS 90 DÍAS de producido el cambio no denunciado.
                        </AlertDescription>
                    </Alert>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-bold">ARTÍCULO 14 LEY NACIONAL 24449</AlertTitle>
                        <AlertDescription>
                            <p>REQUISITOS: SABER LEER Y PARA LOS CONDUCTORES PROFESIONALES TAMBIÉN ESCRIBIR.</p>
                            <p className="mt-2 font-semibold">La seguridad vial es responsabilidad de todos los tunuyaninos</p>
                            <p className="text-sm">Municipalidad de Tunuyán.</p>
                        </AlertDescription>
                    </Alert>
                </div>
            )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {currentStep === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Fecha del turno</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                                            if (!scheduleConfig) return true;

                                            const dayKey = dayNamesInEnglish[date.getDay()];
                                            return !scheduleConfig.days[dayKey]?.enabled;
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger disabled={!selectedDate || availableSlots.length === 0}>
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
                                {selectedDate && availableSlots.length === 0 && !areAppointmentsLoading && <p className="text-sm text-muted-foreground pt-1">No hay horarios disponibles para esta fecha.</p>}
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                
                {currentStep === 1 && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl><Input placeholder="Ej: Juan" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Apellido</FormLabel>
                            <FormControl><Input placeholder="Ej: Pérez" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="dni" render={({ field }) => (
                            <FormItem>
                            <FormLabel>DNI</FormLabel>
                            <FormControl><Input placeholder="Ej: 30123456" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email de contacto</FormLabel>
                            <FormControl><Input type="email" placeholder="ejemplo@correo.com" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Teléfono de contacto</FormLabel>
                            <FormControl><Input placeholder="Ej: 2622123456" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="procedureType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tipo de Trámite</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un trámite" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {procedureTypes.map(proc => (
                                        <SelectItem key={proc.id} value={proc.id}>
                                        {proc.name}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DocumentsFormSection control={form.control} />
                    </div>
                )}


                <div className="flex justify-between gap-4 pt-4">
                    {currentStep > 0 ? (
                        <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Anterior
                        </Button>
                    ) : <Link href="/" passHref><Button type="button" variant="outline">Cancelar</Button></Link>}
                    
                    {currentStep < steps.length - 1 ? (
                        <Button type="button" onClick={nextStep}>
                            Siguiente
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Enviar Solicitud
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
