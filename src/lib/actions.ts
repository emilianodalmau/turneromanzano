'use server';

import { 
    collection, 
    query, 
    where, 
    getDocs, 
    limit,
    doc,
    updateDoc
} from 'firebase/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';
import { uploadFile } from '@/firebase/storage';

// Initialize server-side Firebase
const { firestore } = initializeServerFirebase();

export async function uploadPaymentProof(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const referenceId = formData.get('referenceId') as string;
    const paymentProof = formData.get('paymentProof') as File;

    if (!referenceId || !paymentProof) {
        return { success: false, error: 'Faltan datos requeridos.' };
    }

    try {
        const appointmentsCollection = collection(firestore, 'appointments');
        const q = query(appointmentsCollection, where("referenceId", "==", referenceId), limit(1));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'not_found' };
        }
            
        const appointmentDoc = querySnapshot.docs[0];
        
        const filePath = `comprobantesPago/${appointmentDoc.id}/${paymentProof.name}`;
        const downloadURL = await uploadFile(paymentProof, filePath);
        
        const appointmentRef = doc(firestore, 'appointments', appointmentDoc.id);
        await updateDoc(appointmentRef, { paymentProofUrl: downloadURL });
        
        return { success: true };

    } catch (error) {
        console.error("Server Action Error: ", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'Ocurrió un error desconocido.' };
    }
}
