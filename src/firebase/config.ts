import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// כל סביבה משתמשת ב-authDomain של עצמה (אותו דומיין) כדי שהתחברות Google
// (redirect) תעבוד ללא בעיית אחסון בין-דומיינים. בדומיינים המתארחים ב-Firebase
// Hosting (web.app או הדומיין המותאם) נשתמש ב-host הנוכחי; אחרת בערך מ-env.
const CUSTOM_DOMAINS = ['house-hold-tasks.com', 'www.house-hold-tasks.com'];
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isHostingHost =
  host.endsWith('.web.app') || CUSTOM_DOMAINS.includes(host);
const authDomain = isHostingHost
  ? host
  : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// חיבור אוטומטי ל-Emulators לצורך פיתוח ובדיקות מקומיות
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  // eslint-disable-next-line no-console
  console.info('🔧 מחובר ל-Firebase Emulators (מצב פיתוח מקומי)');
}

export default app;
