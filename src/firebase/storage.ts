'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let storage: ReturnType<typeof getStorage>;

// This is a workaround to initialize storage on the server for Server Actions
// It's not ideal but necessary given the constraints of the environment.
if (typeof window === 'undefined') {
  let app: FirebaseApp;
  try {
    app = initializeApp();
  } catch (e) {
    app = initializeApp(firebaseConfig);
  }
  storage = getStorage(app);
} else {
  // Client-side initialization remains the same.
  const { storage: clientStorage } = require('./index').initializeFirebase();
  storage = clientStorage;
}


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
    // Convert file to buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const snapshot = await uploadBytes(storageRef, buffer, { contentType: file.type });
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    // You might want to re-throw the error or handle it in a specific way
    throw error;
  }
}
