'use server';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeServerFirebase } from './server-init';
import { initializeFirebase } from './index';

// This function gets the storage instance, initializing it if necessary.
function getStorageInstance() {
    if (typeof window === 'undefined') {
        // Server-side: Use the server-specific initialization.
        return initializeServerFirebase().storage;
    } else {
        // Client-side: Use the standard client-side initialization.
        return initializeFirebase().storage;
    }
}

/**
 * Uploads a file to a specified path in Firebase Storage.
 * This function is now isomorphic and can run on both client and server.
 *
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file will be stored.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }
  if (!file) {
    throw new Error("File is not provided for upload.");
  }
  
  const storageRef = ref(storage, path);
  
  try {
    // When running on the server (in a Server Action), we need to convert
    // the file's ArrayBuffer to a Node.js Buffer for uploadBytes.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const snapshot = await uploadBytes(storageRef, buffer, { contentType: file.type });
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    // Re-throw the error to be handled by the caller.
    throw error;
  }
}
