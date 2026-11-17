import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: 'superadmin' | 'admin' | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  adminRole: null,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

// Designated owner email from metadata / environment
const BOOTSTRAPPED_ADMIN_EMAIL = 'newt34441@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [adminRole, setAdminRole] = useState<'superadmin' | 'admin' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const isOwner =
          Boolean(currentUser.email) &&
          currentUser.email!.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

        if (isOwner) {
          setIsAdmin(true);
          setIsSuperAdmin(true);
          setAdminRole('superadmin');
        } else {
          try {
            const adminDocRef = doc(db, 'admins', currentUser.uid);
            const adminSnap = await getDoc(adminDocRef);
            if (adminSnap.exists()) {
              const role = adminSnap.data()?.role === 'superadmin' ? 'superadmin' : 'admin';
              setIsAdmin(true);
              setIsSuperAdmin(role === 'superadmin');
              setAdminRole(role);
            } else {
              setIsAdmin(false);
              setIsSuperAdmin(false);
              setAdminRole(null);
            }
          } catch (err) {
            console.error('Error verifying admin authorization:', err);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setAdminRole(null);
          }
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setAdminRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে';
      setError(msg);
      throw err;
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'লগআউট ব্যর্থ হয়েছে';
      setError(msg);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, isSuperAdmin, adminRole, signInWithGoogle, signOutUser, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};
