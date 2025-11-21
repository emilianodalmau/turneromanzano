'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '@/firebase';

// This function gets the storage instance for the client.
function getClientStorageInstance() {
    // Client-side: Use the standard client-side initialization.
    return initializeFirebase().storage;
}

/**
 * Uploads a file to a specified path in Firebase Storage from the client-side.
 *
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file will be stored.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  const storage = getClientStorageInstance();
  if (!storage) {
    throw new Error("Firebase Storage is not initialized on the client.");
  }
  if (!file) {
    throw new Error("File is not provided for upload.");
  }
  
  const storageRef = ref(storage, path);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    // Re-throw the error to be handled by the caller.
    throw error;
  }
}