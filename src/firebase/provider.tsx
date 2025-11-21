'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User as FirebaseAuthUser } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { User as AppUser } from '@/lib/types';


// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: FirebaseAuthUser | null;
  profile: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: FirebaseAuthUser | null;
  profile: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser()
export interface UserHookResult {
  user: FirebaseAuthUser | null;
  profile: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage
}) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      setError(new Error("Auth service not provided."));
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        if (!firebaseUser) {
          setProfile(null);
          setIsLoading(false);
        }
      },
      (authError) => {
        console.error("onAuthStateChanged error:", authError);
        setError(authError);
        setIsLoading(false);
      }
    );

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    // Add a guard to ensure both user and firestore are available
    if (!user || !firestore) {
      // If there's no user, we are done loading.
      if (!user) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    const profileDocRef = doc(firestore, 'users', user.uid);
    
    const unsubscribeProfile = onSnapshot(profileDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as AppUser);
        } else {
          // Handle case where user is authenticated but has no profile doc yet
          setProfile(null); 
        }
        setIsLoading(false);
      },
      (profileError) => {
        console.error("Profile snapshot error:", profileError);
        setError(profileError);
        setIsLoading(false);
      }
    );

    return () => unsubscribeProfile();
  }, [user, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
      user,
      profile,
      isUserLoading: isLoading,
      userError: error,
    };
  }, [firebaseApp, firestore, auth, storage, user, profile, isLoading, error]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
    user: context.user,
    profile: context.profile,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth | null => {
    const { auth } = useFirebase();
    return auth;
}

export const useFirestore = (): Firestore | null => {
    const { firestore } = useFirebase();
    return firestore;
};

export const useFirebaseApp = (): FirebaseApp | null => {
    const { firebaseApp } = useFirebase();
    return firebaseApp;
};

export const useStorage = (): FirebaseStorage | null => {
    const { storage } = useFirebase();
    return storage;
}


export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (T & {__memo?: boolean}) {
  const memoized = useMemo(factory, deps);
  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as T & {__memo?: boolean}).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, profile, isUserLoading, userError } = useFirebase();
  return { user, profile, isUserLoading, userError };
};
