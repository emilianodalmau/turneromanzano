'use server';

import { revalidatePath } from 'next/cache';
import { Appointment, BookingFormData, ScheduleConfiguration } from './types';
import { optimizeAppointmentSchedule, OptimizeAppointmentScheduleInput } from '@/ai/flows/optimize-appointment-schedule';

// MOCK DATABASE
let appointments: Appointment[] = [
  { id: '1', name: 'Juan', lastName: 'Perez', dni: '12345678', phone: '1122334455', email: 'juan.perez@example.com', date: '2024-08-15', time: '10:00', createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } },
  { id: '2', name: 'Maria', lastName: 'Gomez', dni: '87654321', phone: '5544332211', email: 'maria.gomez@example.com', date: '2024-08-15', time: '11:00', createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } },
];
let schedule: ScheduleConfiguration = {
  id: 'main_schedule',
  monday: { enabled: false, slots: [] },
  tuesday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  wednesday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  thursday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  friday: { enabled: true, slots: ['10:00', '11:00', '14:00', '15:00'] },
  saturday: { enabled: true, slots: ['09:00', '10:00', '11:00', '12:00'] },
  sunday: { enabled: false, slots: [] },
};

export async function getScheduleConfiguration(): Promise<ScheduleConfiguration> {
  return Promise.resolve(schedule);
}

export async function getAvailableSlots(date: string): Promise<{ daySchedule: { enabled: boolean; slots: string[] }, availableSlots: string[] }> {
    const dayOfWeek = new Date(date).getDay();
    const dayNames: (keyof ScheduleConfiguration)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dayOfWeek];
    
    // Fallback for invalid dayKey
    if (!dayKey || !schedule[dayKey]) {
      return { daySchedule: { enabled: false, slots: [] }, availableSlots: [] };
    }

    const daySchedule = schedule[dayKey];
    if (!daySchedule.enabled) {
        return { daySchedule: { enabled: false, slots: [] }, availableSlots: [] };
    }

    const bookedSlots = appointments
        .filter(app => app.date === date)
        .map(app => app.time);
    
    const availableSlots = daySchedule.slots.filter(slot => !bookedSlots.includes(slot));
    
    return Promise.resolve({ daySchedule, availableSlots });
}

export async function bookAppointment(data: BookingFormData, date: string, time: string) {
  const newAppointment: Appointment = {
    id: (appointments.length + 1).toString(),
    ...data,
    date,
    time,
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
  };
  appointments.push(newAppointment);
  revalidatePath('/book');
  revalidatePath('/admin/appointments');
  return Promise.resolve(newAppointment);
}

export async function getAppointments(): Promise<Appointment[]> {
  return Promise.resolve(appointments.sort((a,b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()));
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const index = appointments.findIndex(app => app.id === id);
    if (index === -1) throw new Error('Appointment not found');
    appointments[index] = { ...appointments[index], ...data };
    revalidatePath('/admin/appointments');
    return appointments[index];
}

export async function createAppointment(data: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const newAppointment: Appointment = {
      id: (appointments.length + 2).toString(), // Ensure unique ID
      ...data,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
    };
    appointments.push(newAppointment);
    revalidatePath('/admin/appointments');
    return newAppointment;
}


export async function deleteAppointment(id: string): Promise<{ success: boolean }> {
    appointments = appointments.filter(app => app.id !== id);
    revalidatePath('/admin/appointments');
    revalidatePath('/book');
    return { success: true };
}

export async function updateScheduleConfiguration(newSchedule: ScheduleConfiguration): Promise<ScheduleConfiguration> {
    schedule = { ...schedule, ...newSchedule };
    revalidatePath('/admin/schedule');
    revalidatePath('/book');
    return schedule;
}

export async function runOptimization() {
  try {
    const historicalData = await getAppointments();
    
    // Mock predicted demand for demonstration purposes
    const predictedDemand = {
      "next_month_trend": "increase",
      "peak_days": ["saturday", "friday"],
      "peak_hours": ["10:00", "11:00"],
      "notes": "Expecting higher traffic due to local festival."
    };

    const input: OptimizeAppointmentScheduleInput = {
      historicalData: JSON.stringify(historicalData),
      predictedDemand: JSON.stringify(predictedDemand)
    };
    
    const result = await optimizeAppointmentSchedule(input);
    
    return { success: true, data: result };
  } catch(error) {
    console.error("Optimization failed:", error);
    return { success: false, error: "Failed to run optimization." };
  }
}
