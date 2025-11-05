import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

export interface Appointment {
  id: string;
  userId: string;
  name: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | Timestamp | null;
}

export interface ScheduleDay {
  enabled: boolean;
  slots: string[]; // ["09:00", "10:00"]
}

export interface ScheduleConfiguration {
  id?: string;
  monday: ScheduleDay;
  tuesday: ScheduleDay;
  wednesday: ScheduleDay;
  thursday: ScheduleDay;
  friday: ScheduleDay;
  saturday: ScheduleDay;
  sunday: ScheduleDay;
}

export const bookingFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastName: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  dni: z.string().regex(/^\d{7,8}$/, { message: "Formato de DNI inválido." }),
  phone: z.string().min(8, { message: "El número de teléfono es muy corto." }),
  email: z.string().email({ message: "Dirección de email inválida." }),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
