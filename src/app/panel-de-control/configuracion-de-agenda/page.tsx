
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useUser } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';
import { ScheduleConfiguration, dayNames, DayKey } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

const slotSchema = z.object({
  startTime: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato HH:MM'),
  capacity: z.coerce.number().min(1, 'La capacidad debe ser al menos 1'),
});

const dayConfigSchema = z.object({
  enabled: z.boolean(),
  slots: z.array(slotSchema),
});

const formSchema = z.object({
  days: z.object({
    monday: dayConfigSchema,
    tuesday: dayConfigSchema,
    wednesday: dayConfigSchema,
    thursday: dayConfigSchema,
    friday: dayConfigSchema,
    saturday: dayConfigSchema,
    sunday: dayConfigSchema,
  }),
  leadTimeDays: z.coerce.number().min(0, 'Debe ser 0 o más'),
});

type FormValues = z.infer<typeof formSchema>;

const defaultConfig: FormValues = {
  days: {
    monday: { enabled: false, slots: [] },
    tuesday: { enabled: false, slots: [] },
    wednesday: { enabled: false, slots: [] },
    thursday: { enabled: false, slots: [] },
    friday: { enabled: false, slots: [] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] },
  },
  leadTimeDays: 0,
};

interface DayScheduleAccordionProps {
  dayKey: DayKey;
  dayName: string;
  form: UseFormReturn<FormValues>;
}

function DayScheduleAccordion({ dayKey, dayName, form }: DayScheduleAccordionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `days.${dayKey}.slots`,
  });

  const isDayEnabled = form.watch(`days.${dayKey}.enabled`);

  return (
    <AccordionItem value={dayKey}>
      <div className="flex items-center w-full p-4">
        <FormField
          control={form.control}
          name={`days.${dayKey}.enabled`}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 mr-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    const isChecked = !!checked;
                    field.onChange(isChecked);
                    if (!isChecked) {
                      form.setValue(`days.${dayKey}.slots`, []);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <AccordionTrigger>
          <FormLabel className="text-lg cursor-pointer">{dayName}</FormLabel>
        </AccordionTrigger>
      </div>
      <AccordionContent className="pl-8 border-l ml-4">
        {isDayEnabled ? (
          <div className="space-y-4 pt-4">
            {fields.map((slot, slotIndex) => (
              <div key={slot.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 rounded-md border">
                <FormField
                  control={form.control}
                  name={`days.${dayKey}.slots.${slotIndex}.startTime`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de inicio</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`days.${dayKey}.slots.${slotIndex}.endTime`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de fin</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`days.${dayKey}.slots.${slotIndex}.capacity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidad</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej: 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(slotIndex)}
                  className="w-full md:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ startTime: '', endTime: '', capacity: 1 })}
            >
              Añadir Horario
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground p-4">Este día está deshabilitado.</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function BlockedDatesManager({ scheduleRef, initialBlockedDates }: { scheduleRef: DocumentReference | null, initialBlockedDates?: string[] }) {
    const { toast } = useToast();
    // Convert string dates from props to Date objects for the calendar
    const initialDates = useMemoFirebase(() => initialBlockedDates?.map(dateStr => new Date(dateStr + 'T00:00:00')) || [], [initialBlockedDates]);
    const [blockedDates, setBlockedDates] = useState<Date[] | undefined>(initialDates);

    useEffect(() => {
        setBlockedDates(initialDates);
    }, [initialDates]);

    const handleSaveBlockedDates = () => {
        if (!scheduleRef) {
            toast({
                variant: "destructive",
                title: 'Error',
                description: 'No se pudo conectar a la base de datos.',
            });
            return;
        }

        // Convert Date objects back to 'YYYY-MM-DD' strings before saving
        const datesToSave = blockedDates?.map(date => format(date, 'yyyy-MM-dd')) || [];
        updateDocumentNonBlocking(scheduleRef, { blockedDates: datesToSave });

        toast({
            title: 'Fechas bloqueadas actualizadas',
            description: 'El calendario ha sido actualizado con los nuevos días no laborables.',
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Bloquear Fechas Específicas</CardTitle>
                <CardDescription>
                    Selecciona los días festivos o fechas particulares en las que el Parque Temático Sanmartiniano no trabajará. 
                    Estos días no permitirán sacar turnos, independientemente de la configuración semanal.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <Calendar
                    mode="multiple"
                    selected={blockedDates}
                    onSelect={setBlockedDates}
                    className="rounded-md border"
                    disabled={{ before: new Date(new Date().setDate(new Date().getDate() - 1)) }}
                />
                <Button onClick={handleSaveBlockedDates} className="w-full md:w-auto">Guardar Fechas Bloqueadas</Button>
            </CardContent>
        </Card>
    );
}


export default function ScheduleConfigPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const scheduleRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'scheduleConfigurations', 'default') : null),
    [firestore, user]
  );

  const { data: scheduleConfig, isLoading: isDocLoading } = useDoc<ScheduleConfiguration>(scheduleRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultConfig,
  });

  useEffect(() => {
    if (!isDocLoading && scheduleConfig) {
        // Reset with scheduleConfig, including leadTimeDays if present
        form.reset({
            days: scheduleConfig.days || defaultConfig.days,
            leadTimeDays: scheduleConfig.leadTimeDays ?? defaultConfig.leadTimeDays,
        });
    } else if (!isDocLoading && !scheduleConfig) {
        // If the document doesn't exist, reset with the default config
        form.reset(defaultConfig);
    }
}, [scheduleConfig, isDocLoading, form]);


  function onSubmit(data: FormValues) {
    if (!scheduleRef) {
        toast({
            variant: "destructive",
            title: 'Error',
            description: 'No se pudo conectar a la base de datos. Inténtalo de nuevo.',
        });
        return;
    }
    // Use update to avoid overwriting blockedDates
    updateDocumentNonBlocking(scheduleRef, { 
        days: data.days,
        leadTimeDays: data.leadTimeDays 
    });
    toast({
      title: 'Configuración actualizada',
      description: 'Los horarios y días de antelación han sido guardados correctamente.',
    });
  }
  
  if (isUserLoading || (scheduleRef && isDocLoading)) {
    return <p>Cargando configuración...</p>
  }

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Días y Horarios</CardTitle>
                <CardDescription>Define qué días de la semana se pueden sacar turnos y los horarios disponibles para cada uno.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Accordion type="multiple" className="w-full">
                    {(Object.keys(dayNames) as DayKey[]).map((dayKey) => (
                        <DayScheduleAccordion
                        key={dayKey}
                        dayKey={dayKey}
                        dayName={dayNames[dayKey]}
                        form={form}
                        />
                    ))}
                    </Accordion>
                    <Button type="submit">Guardar Horarios Semanales</Button>
                </form>
                </Form>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Días de Antelación</CardTitle>
                <CardDescription>
                    Configura cuántos días antes de la visita se deben solicitar los turnos. 
                    Si pones 15, los usuarios solo podrán sacar turnos a partir de los próximos 15 días. 
                    Usa 0 para permitir turnos desde hoy mismo (sujeto a disponibilidad).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="leadTimeDays"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mínimo de días de antelación</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Guardar Días de Antelación</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <BlockedDatesManager scheduleRef={scheduleRef} initialBlockedDates={scheduleConfig?.blockedDates} />
    </div>
  );
}

