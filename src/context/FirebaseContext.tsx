import React, { createContext, useContext, ReactNode } from 'react';
import { app, auth, database } from '../lib/firebase';
import { getMessaging } from 'firebase/messaging';

interface FirebaseContextType {
  app: typeof app;
  auth: typeof auth;
  database: typeof database;
  messaging: ReturnType<typeof getMessaging>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const messaging = getMessaging(app);
  
  const value = {
    app,
    auth,
    database,
    messaging,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
