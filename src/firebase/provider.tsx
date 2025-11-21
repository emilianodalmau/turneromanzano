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
    if (!user || !firestore) {
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

  const contextValue = useMemo((): FirebaseContextState => ({
      firebaseApp,
      firestore,
      auth,
      storage,
      user,
      profile,
      isUserLoading: isLoading,
      userError: error,
    }), [firebaseApp, firestore, auth, storage, user, profile, isLoading, error]);

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
  return context;
};

export const useAuth = (): Auth | null => {
    const context = useContext(FirebaseContext);
    return context?.auth ?? null;
}

export const useFirestore = (): Firestore | null => {
    const context = useContext(FirebaseContext);
    return context?.firestore ?? null;
};

export const useFirebaseApp = (): FirebaseApp | null => {
    const context = useContext(FirebaseContext);
    return context?.firebaseApp ?? null;
};

export const useStorage = (): FirebaseStorage | null => {
    const context = useContext(FirebaseContext);
    return context?.storage ?? null;
}


export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (T & {__memo?: boolean}) {
  const memoized = useMemo(factory, deps);
  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as T & {__memo?: boolean}).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
   if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  return { user: context.user, profile: context.profile, isUserLoading: context.isUserLoading, userError: context.userError };
};
