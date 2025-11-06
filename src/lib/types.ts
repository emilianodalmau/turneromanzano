
export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const dayNames: Record<DayKey, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export interface TimeSlot {
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface DayConfiguration {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface ScheduleConfiguration {
  days: {
    [key in DayKey]: DayConfiguration;
  };
}
