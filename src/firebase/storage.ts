'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '.';

const { storage } = initializeFirebase();

/**
 * Uploads a file to a specified path in Firebase Storage.
 *
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file will be stored.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
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
    // You might want to re-throw the error or handle it in a specific way
    throw error;
  }
}
