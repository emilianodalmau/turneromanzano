'use client';

import { useFieldArray, Control } from 'react-hook-form';
import { ScheduleConfiguration } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

interface ScheduleDayCardProps {
  dayKey: keyof Omit<ScheduleConfiguration, 'id'>;
  dayName: string;
  control: Control<ScheduleConfiguration>;
  getValues: (name: string) => any;
  setValue: (name: string, value: any, options?: { shouldValidate?: boolean; shouldDirty?: boolean }) => void;
}

export function ScheduleDayCard({ dayKey, dayName, control, getValues, setValue }: ScheduleDayCardProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${dayKey}.slots`,
  });
  
  const isEnabled = getValues(`${dayKey}.enabled`);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Label htmlFor={`${dayKey}-enabled`} className="text-lg font-semibold text-primary">{dayName}</Label>
        <Switch
          id={`${dayKey}-enabled`}
          checked={isEnabled}
          onCheckedChange={(checked) => setValue(`${dayKey}.enabled`, checked, { shouldDirty: true })}
        />
      </div>
      {isEnabled && (
        <div className="pl-2 border-l-2 border-border ml-2 space-y-3 pt-2">
          <Label className="text-sm font-medium">Horarios disponibles</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {fields.map((field, slotIndex) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  type="time"
                  {...control.register(`${dayKey}.slots.${slotIndex}` as const)}
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
}
