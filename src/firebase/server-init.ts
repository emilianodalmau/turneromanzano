import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// This function is for SERVER-SIDE use only.
export function initializeServerFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // Prefer automatic initialization if available (e.g., in App Hosting)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to manual config for other server environments
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  } else {
    // Return existing app instance
    return getSdks(getApp());
  }
}

function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}
