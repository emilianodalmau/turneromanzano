'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ScheduleConfiguration, dayNames } from '@/lib/types';

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
};

export default function ScheduleConfigPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const scheduleRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'scheduleConfigurations', 'default') : null),
    [firestore]
  );

  const { data: scheduleConfig, isLoading } = useDoc<ScheduleConfiguration>(scheduleRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultConfig,
  });

  useEffect(() => {
    if (scheduleConfig) {
      form.reset({ days: scheduleConfig.days });
    }
  }, [scheduleConfig, form]);

  const { fields, control } = form;

  const dayFields = Object.keys(dayNames).map(
    (day) =>
      ({
        ...useFieldArray({
          control,
          name: `days.${day}.slots`,
        }),
        day,
      })
  );

  function onSubmit(data: FormValues) {
    if (!scheduleRef) return;
    setDocumentNonBlocking(scheduleRef, data);
    toast({
      title: 'Horarios actualizados',
      description: 'La configuración de la agenda ha sido guardada correctamente.',
    });
  }

  if (isLoading) {
    return <p>Cargando configuración...</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Agenda</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="multiple" className="w-full">
              {Object.entries(dayNames).map(([dayKey, dayName], index) => {
                const dayFieldArray = dayFields.find(df => df.day === dayKey)!;
                const isDayEnabled = form.watch(`days.${dayKey}.enabled`);

                return (
                  <AccordionItem value={dayKey} key={dayKey}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-4">
                        <FormField
                          control={form.control}
                          name={`days.${dayKey}.enabled`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                               <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if(!checked) {
                                      dayFieldArray.replace([]);
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                               </FormControl>
                               <FormLabel className='text-lg'>{dayName}</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-4 border-l ml-4">
                      {isDayEnabled ? (
                      <div className="space-y-4 pt-4">
                        {dayFieldArray.fields.map((slot, slotIndex) => (
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
                              onClick={() => dayFieldArray.remove(slotIndex)}
                              className="w-full md:w-auto"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </Button>
                          </div>
                        ))}
                         <Button
                          type="button"
                          variant="outline"
                          onClick={() => dayFieldArray.append({ startTime: '', endTime: '', capacity: 1 })}
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
              })}
            </Accordion>
            <Button type="submit">Guardar Cambios</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
