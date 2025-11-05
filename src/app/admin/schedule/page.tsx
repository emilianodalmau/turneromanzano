'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { ScheduleConfiguration } from '@/lib/types';
import { updateScheduleConfigurationAction, getScheduleConfiguration } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const form = useForm<ScheduleConfiguration>();
  
  useEffect(() => {
    setIsLoading(true);
    getScheduleConfiguration().then(data => {
      form.reset(data);
      setIsLoading(false);
    }).catch(() => {
        toast({ title: 'Error', description: 'No se pudo cargar la configuración.', variant: 'destructive' });
        setIsLoading(false);
    });
  }, [form, toast]);

  const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: `saturday.slots`
  });
  
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
              const { fields, append, remove } = useFieldArray({
                control: form.control,
                name: `${dayKey}.slots`,
              });

              return (
                <Card key={dayKey} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label htmlFor={`${dayKey}-enabled`} className="text-lg font-semibold text-primary">{dayNames[dayKey]}</Label>
                    <Switch
                      id={`${dayKey}-enabled`}
                      checked={form.watch(`${dayKey}.enabled`)}
                      onCheckedChange={(checked) => form.setValue(`${dayKey}.enabled`, checked)}
                    />
                  </div>
                  {form.watch(`${dayKey}.enabled`) && (
                    <div className="pl-2 border-l-2 border-border ml-2 space-y-3 pt-2">
                      <Label className="text-sm font-medium">Horarios disponibles</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {fields.map((field, slotIndex) => (
                           <div key={field.id} className="flex items-center gap-2">
                             <Input
                               type="time"
                               {...form.register(`${dayKey}.slots.${slotIndex}` as const)}
                             />
                             <Button variant="ghost" size="icon" type="button" onClick={() => remove(slotIndex)}>
                               <Trash2 className="h-4 w-4 text-destructive" />
                             </Button>
                           </div>
                        ))}
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => append('10:00')}>
                        Añadir horario
                      </Button>
                    </div>
                  )}
                </Card>
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
