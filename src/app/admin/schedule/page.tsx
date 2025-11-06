'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ScheduleConfiguration } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleDayCard } from '@/components/admin/ScheduleDayCard';
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, DocumentReference } from 'firebase/firestore';

const dayNames: Record<keyof Omit<ScheduleConfiguration, 'id'>, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const defaultConfig: ScheduleConfiguration = {
  id: 'main_schedule',
  monday: { enabled: false, slots: [] },
  tuesday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  wednesday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  thursday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  friday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  saturday: { enabled: true, slots: ['09:00', '10:00', '11:00', '12:00'] },
  sunday: { enabled: false, slots: [] },
};

export default function SchedulePage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { firestore, areServicesAvailable } = useFirebase();

  const scheduleRef = useMemoFirebase(() => 
    areServicesAvailable && firestore 
      ? doc(firestore, 'scheduleConfigurations', 'main_schedule') as DocumentReference<ScheduleConfiguration> 
      : null
  , [firestore, areServicesAvailable]);

  const { data: scheduleConfig, isLoading } = useDoc<ScheduleConfiguration>(scheduleRef);

  const form = useForm<ScheduleConfiguration>({
    defaultValues: defaultConfig
  });

  useEffect(() => {
    if (scheduleConfig) {
      form.reset(scheduleConfig);
    } else if (!isLoading && scheduleConfig === null && firestore && scheduleRef) {
      setDocumentNonBlocking(scheduleRef, defaultConfig);
    }
  }, [scheduleConfig, isLoading, form, firestore, scheduleRef]);
  
  const onSubmit = (data: ScheduleConfiguration) => {
    if (!firestore || !scheduleRef) return;
    
    startTransition(() => {
      setDocumentNonBlocking(scheduleRef, data);
      toast({ title: 'Horarios actualizados', description: 'La configuración de horarios se ha guardado.' });
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Configuración de Horarios</h1>
        <p className="text-muted-foreground">
          Defina los días y horarios disponibles para las reservas de turnos.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Disponibilidad Semanal</CardTitle>
            <CardDescription>Active o desactive días y administre los horarios para cada uno.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.keys(dayNames).map((day) => {
              const dayKey = day as keyof Omit<ScheduleConfiguration, 'id'>;
              return (
                <ScheduleDayCard
                  key={dayKey}
                  dayKey={dayKey}
                  dayName={dayNames[dayKey]}
                  control={form.control}
                  getValues={form.watch}
                  setValue={form.setValue}
                />
              );
            })}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
