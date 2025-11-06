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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ScheduleConfiguration, dayNames, DayKey } from '@/lib/types';

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

interface DayScheduleAccordionProps {
  dayKey: DayKey;
  dayName: string;
  form: UseFormReturn<FormValues>;
}

function DayScheduleAccordion({ dayKey, dayName, form }: DayScheduleAccordionProps) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: `days.${dayKey}.slots`,
  });

  const isDayEnabled = form.watch(`days.${dayKey}.enabled`);

  return (
    <AccordionItem value={dayKey}>
      <div className="flex items-center w-full">
        <FormField
          control={form.control}
          name={`days.${dayKey}.enabled`}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    const isChecked = !!checked;
                    field.onChange(isChecked);
                    if (!isChecked) {
                      replace([]);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <AccordionTrigger>
          <FormLabel className="text-lg">{dayName}</FormLabel>
        </AccordionTrigger>
      </div>
      <AccordionContent className="pl-4 border-l ml-4">
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


export default function ScheduleConfigPage() {
  const { toast } = useToast();
  const { firestore, areServicesAvailable } = useFirebase();

  const scheduleRef = useMemoFirebase(
    () => (areServicesAvailable ? doc(firestore, 'scheduleConfigurations', 'default') : null),
    [firestore, areServicesAvailable]
  );

  const { data: scheduleConfig, isLoading } = useDoc<ScheduleConfiguration>(scheduleRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultConfig,
  });

  useEffect(() => {
    if (!isLoading && scheduleConfig === null && scheduleRef) {
        setDocumentNonBlocking(scheduleRef, defaultConfig, { merge: false });
    }
    if (scheduleConfig) {
      form.reset({ days: scheduleConfig.days });
    }
  }, [scheduleConfig, isLoading, form, scheduleRef]);


  function onSubmit(data: FormValues) {
    if (!scheduleRef) return;
    setDocumentNonBlocking(scheduleRef, data, { merge: false });
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
              {(Object.keys(dayNames) as DayKey[]).map((dayKey) => (
                <DayScheduleAccordion
                  key={dayKey}
                  dayKey={dayKey}
                  dayName={dayNames[dayKey]}
                  form={form}
                />
              ))}
            </Accordion>
            <Button type="submit">Guardar Cambios</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
