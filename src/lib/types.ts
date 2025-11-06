
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

// Omit 'id' from the base Appointment to prevent it from being overwritten during updates.
export interface Appointment extends Omit<MutableAppointment, 'id'> {
  readonly id: string;
}

// This represents the fields that can be created or updated.
export interface MutableAppointment {
  id: string;
  userId: string;
  date: string; // Stored as 'yyyy-MM-dd'
  startTime: string;
  endTime: string;
  responsibleName: string;
  schoolName: string;
  visitorCount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}
