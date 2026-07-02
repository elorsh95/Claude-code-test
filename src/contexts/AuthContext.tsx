import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updatePassword,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { upsertUser } from '../lib/households';
import { mapAuthError } from '../lib/authErrors';
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  /** שגיאה שהתרחשה בחזרה מהתחברות Google (redirect) */
  authError: string | null;
  clearAuthError: () => void;
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
  /** עדכון שם התצוגה של המשתמש הנוכחי */
  updateDisplayName: (name: string) => Promise<void>;
  /** קביעת/עדכון סיסמה לחשבון הנוכחי (מאפשר התחברות אימייל+סיסמה גם למי שנכנס עם Google) */
  setAccountPassword: (password: string) => Promise<void>;
  /** האם לחשבון הנוכחי כבר יש שיטת אימייל+סיסמה */
  hasPasswordProvider: () => boolean;
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
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // טיפול בחזרה מהתחברות Google (redirect) - יצירת מסמך משתמש אם חדש
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) return upsertUser(toAppUser(res.user));
      })
      .catch((e) => {
        console.error('Google redirect error:', e);
        setAuthError(mapAuthError(e));
      });

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
    // הפניה מלאה ל-Google; החזרה מטופלת ב-getRedirectResult בעת טעינת האפליקציה
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateDisplayName(name: string) {
    const u = auth.currentUser;
    if (!u) return;
    await updateProfile(u, { displayName: name.trim() });
    await upsertUser({
      uid: u.uid,
      email: u.email ?? '',
      displayName: name.trim(),
      phone: u.phoneNumber ?? undefined,
    });
    setUser(toAppUser(u));
  }

  function hasPasswordProvider() {
    return (
      auth.currentUser?.providerData.some(
        (p) => p.providerId === 'password'
      ) ?? false
    );
  }

  async function setAccountPassword(password: string) {
    const u = auth.currentUser;
    if (!u || !u.email) {
      throw new Error('לחשבון זה אין כתובת אימייל לקביעת סיסמה');
    }
    if (hasPasswordProvider()) {
      await updatePassword(u, password);
    } else {
      const cred = EmailAuthProvider.credential(u.email, password);
      await linkWithCredential(u, cred);
    }
    setUser(toAppUser(u));
  }

  function reloadUser() {
    if (auth.currentUser) setUser(toAppUser(auth.currentUser));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        updateDisplayName,
        setAccountPassword,
        hasPasswordProvider,
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
