'use server';

import { revalidatePath } from 'next/cache';
import { Appointment, BookingFormData, ScheduleConfiguration } from './types';
import { optimizeAppointmentSchedule, OptimizeAppointmentScheduleInput } from '@/ai/flows/optimize-appointment-schedule';
import { initializeServerFirebase } from '@/firebase/server-init';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, collectionGroup, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

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

    const appointmentsQuery = query(collectionGroup(firestore, 'appointments'), where('date', '==', date));
    const appointmentsSnap = await getDocs(appointmentsQuery);
    const bookedSlots = appointmentsSnap.docs.map(doc => doc.data().time);
    
    const availableSlots = daySchedule.slots.filter(slot => !bookedSlots.includes(slot));
    
    return { daySchedule, availableSlots };
}

export async function bookAppointment(data: BookingFormData, date: string, time: string) {
  const { firestore, auth } = initializeServerFirebase();
  const batch = writeBatch(firestore);

  // 1. Create a user with email and password
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, `dni${data.dni}`);
  const user = userCredential.user;

  // 2. Create the user profile document
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
  
  // 3. Create the appointment document
  const appointmentRef = doc(collection(firestore, `users/${user.uid}/appointments`));
  const appointmentPayload = {
    id: appointmentRef.id,
    userId: user.uid,
    date,
    time,
    createdAt: serverTimestamp(),
    // Include user details in appointment for easier retrieval in admin
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
  // we can't return a payload with a serverTimestamp, so we just return the data
  return { ...appointmentPayload, createdAt: new Date() };
}


export async function getAppointments(): Promise<Appointment[]> {
  const { firestore } = initializeServerFirebase();
  const appointmentsQuery = collectionGroup(firestore, 'appointments');
  const querySnapshot = await getDocs(appointmentsQuery);
  const appointments = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          // Convert Firestore Timestamp to a serializable format
          createdAt: data.createdAt ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } : null
      } as Appointment;
  });
  return appointments.sort((a,b) => {
      const aTime = a.createdAt ? (a.createdAt.seconds * 1000) : new Date(`${a.date}T${a.time}`).getTime();
      const bTime = b.createdAt ? (b.createdAt.seconds * 1000) : new Date(`${b.date}T${b.time}`).getTime();
      return bTime - aTime;
  });
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const { firestore } = initializeServerFirebase();
    
    // We need to find the user this appointment belongs to.
    const q = query(collectionGroup(firestore, 'appointments'), where('id', '==', id));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Appointment not found");
    const appointmentRef = snap.docs[0].ref;

    await setDoc(appointmentRef, data, { merge: true });
    
    revalidatePath('/admin/appointments');

    const updatedDoc = await getDoc(appointmentRef);
    const updatedData = updatedDoc.data() as Appointment;
     return {
        ...updatedData,
        // Convert Firestore Timestamp to a serializable format
        createdAt: updatedData.createdAt ? { seconds: updatedData.createdAt.seconds, nanoseconds: updatedData.createdAt.nanoseconds } : null
    } as Appointment;
}

export async function createAppointment(data: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const { firestore } = initializeServerFirebase();
    // In admin creation, we might not have a user session.
    // We'll create/find a user based on email.
    
    // This is a simplified approach. A real app would handle user lookups more robustly.
    const tempEmail = data.email || `${data.dni}@example.com`;
    let userId = '';

    // Simplified: Look for user by DNI in users collection instead of auth service
    const usersRef = collection(firestore, 'users');
    const userQuery = query(usersRef, where('dni', '==', data.dni));
    const userSnap = await getDocs(userQuery);

    if (!userSnap.empty) {
        userId = userSnap.docs[0].id;
    } else {
        // If user doesn't exist, create one (in a real app, you'd separate user creation)
         const newUserRef = doc(usersRef);
         userId = newUserRef.id;
         await setDoc(newUserRef, {
            id: userId,
            dni: data.dni,
            email: data.email,
            name: data.name,
            lastName: data.lastName,
            phone: data.phone,
         });
    }

    const appointmentRef = doc(collection(firestore, `users/${userId}/appointments`));
    const newAppointment: Appointment = {
      id: appointmentRef.id,
      userId: userId,
      ...data,
      createdAt: serverTimestamp() as any // Cast for server-side
    };
    await setDoc(appointmentRef, newAppointment);

    revalidatePath('/admin/appointments');
    const savedData = (await getDoc(appointmentRef)).data() as Appointment
     return {
        ...savedData,
        // Convert Firestore Timestamp to a serializable format
        createdAt: savedData.createdAt ? { seconds: savedData.createdAt.seconds, nanoseconds: savedData.createdAt.nanoseconds } : null
    } as Appointment;
}


export async function deleteAppointment(id: string): Promise<{ success: boolean }> {
    const { firestore } = initializeServerFirebase();
    const q = query(collectionGroup(firestore, 'appointments'), where('id', '==', id));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn("Could not find appointment to delete");
      return { success: false };
    }
    
    await deleteDoc(snap.docs[0].ref);

    revalidatePath('/admin/appointments');
    revalidatePath('/book');
    return { success: true };
}

export async function updateScheduleConfiguration(newSchedule: ScheduleConfiguration): Promise<ScheduleConfiguration> {
    const { firestore } = initializeServerFirebase();
    const scheduleRef = doc(firestore, 'scheduleConfigurations', 'main_schedule');
    await setDoc(scheduleRef, newSchedule, { merge: true });

    revalidatePath('/admin/schedule');
    revalidatePath('/book');
    return newSchedule;
}

export async function runOptimization() {
  try {
    const historicalData = await getAppointments();
    
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
