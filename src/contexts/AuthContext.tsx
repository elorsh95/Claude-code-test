import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { upsertUser } from '../lib/households';
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** רענון פרטי המשתמש מ-Firebase (למשל אחרי עדכון שם בהתחברות טלפון) */
  reloadUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAppUser(fbUser: FirebaseUser): AppUser {
  const fallback = fbUser.email
    ? fbUser.email.split('@')[0]
    : fbUser.phoneNumber ?? 'משתמש';
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: fbUser.displayName ?? fallback,
    phone: fbUser.phoneNumber ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser ? toAppUser(fbUser) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function register(
    name: string,
    email: string,
    password: string,
    phone?: string
  ) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const appUser = {
      ...toAppUser(cred.user),
      displayName: name,
      phone: phone?.trim() || undefined,
    };
    await upsertUser(appUser);
    setUser(appUser);
  }

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(toAppUser(cred.user));
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const appUser = toAppUser(cred.user);
    await upsertUser(appUser);
    setUser(appUser);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  function reloadUser() {
    if (auth.currentUser) setUser(toAppUser(auth.currentUser));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
