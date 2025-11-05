'use server';

import { revalidatePath } from 'next/cache';
import { Appointment, BookingFormData, ScheduleConfiguration } from './types';
import { optimizeAppointmentSchedule, OptimizeAppointmentScheduleInput } from '@/ai/flows/optimize-appointment-schedule';
import { initializeServerFirebase } from '@/firebase/server-init';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, collectionGroup, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// IMPORTANT: This file contains server-side logic only.
// Client-side data fetching and mutations should use the hooks and utilities from '/firebase'.

export async function getScheduleConfiguration(): Promise<ScheduleConfiguration> {
  const { firestore } = initializeServerFirebase();
  const scheduleRef = doc(firestore, 'scheduleConfigurations', 'main_schedule');
  const scheduleSnap = await getDoc(scheduleRef);

  if (!scheduleSnap.exists()) {
    // If no config, create a default one
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
    await setDoc(scheduleRef, defaultConfig);
    return defaultConfig;
  }
  return scheduleSnap.data() as ScheduleConfiguration;
}

export async function getAvailableSlots(date: string): Promise<{ daySchedule: { enabled: boolean; slots: string[] }, availableSlots: string[] }> {
    const { firestore } = initializeServerFirebase();
    const schedule = await getScheduleConfiguration();
    const dayOfWeek = new Date(date).getUTCDay();
    const dayNames: (keyof Omit<ScheduleConfiguration, 'id'>)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dayOfWeek];

    if (!dayKey || !schedule[dayKey]) {
      return { daySchedule: { enabled: false, slots: [] }, availableSlots: [] };
    }

    const daySchedule = schedule[dayKey];
    if (!daySchedule.enabled) {
        return { daySchedule: { enabled: false, slots: [] }, availableSlots: [] };
    }

    // This is a server action, it can query across all users' appointments
    const appointmentsQuery = query(collectionGroup(firestore, 'appointments'), where('date', '==', date));
    const appointmentsSnap = await getDocs(appointmentsQuery);
    const bookedSlots = appointmentsSnap.docs.map(doc => doc.data().time);
    
    const availableSlots = daySchedule.slots.filter(slot => !bookedSlots.includes(slot));
    
    return { daySchedule, availableSlots };
}

export async function getAppointments(): Promise<Appointment[]> {
  const { firestore } = initializeServerFirebase();
  const appointmentsQuery = collectionGroup(firestore, 'appointments');
  const querySnapshot = await getDocs(appointmentsQuery);
  const appointments = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Firestore Timestamps need to be converted to a serializable format for the client
      return {
          ...data,
          createdAt: data.createdAt ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } : null
      } as Appointment;
  });
  // Sort on the server before sending to the client
  return appointments.sort((a,b) => {
      const aTime = a.createdAt ? (a.createdAt.seconds * 1000) : new Date(`${a.date}T${a.time}`).getTime();
      const bTime = b.createdAt ? (b.createdAt.seconds * 1000) : new Date(`${b.date}T${b.time}`).getTime();
      return bTime - aTime;
  });
}

// This function is complex and involves auth, it will remain a server action.
export async function bookAppointmentAction(data: BookingFormData, date: string, time: string) {
  const { firestore, auth } = initializeServerFirebase();
  
  // A real app should have more robust user handling (e.g. sign in with providers)
  // For simplicity, we create a new user for each booking.
  // We use a password that is not secure, in a real app use a secure password or a different auth method.
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, `dni${data.dni}`);
    const user = userCredential.user;
    
    const batch = writeBatch(firestore);

    // Create the user profile document
    const userRef = doc(firestore, 'users', user.uid);
    const userPayload = { 
        id: user.uid,
        name: data.name,
        lastName: data.lastName,
        dni: data.dni,
        phone: data.phone,
        email: data.email
    };
    batch.set(userRef, userPayload);
    
    // Create the appointment document
    const appointmentRef = doc(collection(firestore, `users/${user.uid}/appointments`));
    const appointmentPayload = {
      id: appointmentRef.id,
      userId: user.uid,
      date,
      time,
      createdAt: serverTimestamp(),
      name: data.name,
      lastName: data.lastName,
      dni: data.dni,
      phone: data.phone,
      email: data.email,
    };
    batch.set(appointmentRef, appointmentPayload);

    await batch.commit();

    revalidatePath('/book');
    revalidatePath('/admin/appointments');
    // We can't return the payload with a serverTimestamp, so we create a new Date.
    return { success: true, data: { ...appointmentPayload, createdAt: new Date() } };
  } catch (error: any) {
    console.error("Booking failed:", error);
    // Return a generic error message to the client
    if (error.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Este email ya está registrado. Por favor, intente con otro.' };
    }
    return { success: false, error: "No se pudo crear el turno. Por favor, intente de nuevo." };
  }
}

export async function runOptimization() {
  try {
    const historicalData = await getAppointments();
    
    // This is a placeholder for a more complex demand prediction model
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

// Server Action for updating the schedule. We keep this on the server
// as it's a core administrative function.
export async function updateScheduleConfigurationAction(newSchedule: ScheduleConfiguration): Promise<{success: boolean, error?: string}> {
    const { firestore } = initializeServerFirebase();
    const scheduleRef = doc(firestore, 'scheduleConfigurations', 'main_schedule');
    try {
      await setDoc(scheduleRef, newSchedule, { merge: true });
      revalidatePath('/admin/schedule');
      revalidatePath('/book'); // So clients get new slots
      return { success: true };
    } catch(error: any) {
      console.error("Failed to update schedule:", error);
      return { success: false, error: "No se pudo guardar la configuración." };
    }
}
