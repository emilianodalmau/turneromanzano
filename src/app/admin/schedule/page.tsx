'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ScheduleConfiguration } from '@/lib/types';
import { updateScheduleConfigurationAction, getScheduleConfiguration } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleDayCard } from '@/components/admin/ScheduleDayCard';

const dayNames: Record<keyof Omit<ScheduleConfiguration, 'id'>, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export default function SchedulePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<ScheduleConfiguration>({
    defaultValues: {
      monday: { enabled: false, slots: [] },
      tuesday: { enabled: false, slots: [] },
      wednesday: { enabled: false, slots: [] },
      thursday: { enabled: false, slots: [] },
      friday: { enabled: false, slots: [] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] },
    }
  });

  useEffect(() => {
    setIsLoading(true);
    getScheduleConfiguration().then(data => {
      if (data) {
        form.reset(data);
      }
      setIsLoading(false);
    }).catch(() => {
        toast({ title: 'Error', description: 'No se pudo cargar la configuración.', variant: 'destructive' });
        setIsLoading(false);
    });
  }, [form, toast]);
  
  const onSubmit = (data: ScheduleConfiguration) => {
    startTransition(async () => {
      const { success, error } = await updateScheduleConfigurationAction(data);
      if (success) {
        toast({ title: 'Horarios actualizados', description: 'La configuración de horarios se ha guardado.' });
      } else {
        toast({ title: 'Error', description: error || 'No se pudo guardar la configuración.', variant: 'destructive' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
