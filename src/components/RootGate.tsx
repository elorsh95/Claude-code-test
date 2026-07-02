import { useAuth } from '../contexts/AuthContext';
import { Layout } from './Layout';
import { LandingPage } from '../pages/LandingPage';

/**
 * שער הכתובת הראשית: אורח רואה דף נחיתה ציבורי (הומפייג'),
 * ומשתמש מחובר רואה את האפליקציה. כך דף הבית נגיש ללא התחברות.
 */
export function RootGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return user ? <Layout /> : <LandingPage />;
}
