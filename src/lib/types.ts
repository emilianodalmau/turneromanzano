'use client';

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

export const procedureTypes = [
    { id: 'original', name: 'Original' },
    { id: 'renovacion', name: 'Renovación' },
    { id: 'ampliacion', name: 'Ampliación' },
    { id: 'duplicado', name: 'Duplicado' },
    { id: 'reemplazo', name: 'Reemplazo' },
    { id: 'renovacion_con_ampliacion', name: 'Renovación con Ampliación' },
];

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
  paid?: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  role?: 'manzano_admin' | 'license_admin' | 'super_admin';
}


export interface LicenseAppointment extends Omit<MutableLicenseAppointment, 'id'> {
  readonly id: string;
}

export interface MutableLicenseAppointment {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  procedureType: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface LicenseScheduleConfiguration {
    days: {
        [key in DayKey]: DayConfiguration;
    };
}
