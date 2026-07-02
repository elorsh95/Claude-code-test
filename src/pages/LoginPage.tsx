import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { withTimeout } from '../lib/format';

export function LoginPage() {
  const { login, user, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // אם כבר מחוברים - מעבר אוטומטי (בתוך effect, לא בזמן render)
  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, redirect, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await withTimeout(login(email.trim(), password));
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('הזן את האימייל שלך למעלה ואז לחץ "שכחתי סיסמה"');
      return;
    }
    setBusy(true);
    try {
      await withTimeout(resetPassword(email.trim()));
      setInfo('נשלח אליך מייל לאיפוס סיסמה. בדוק את תיבת הדואר (וגם ספאם).');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src="/icons/icon.svg" alt="" className="auth-logo" />
        <h2>התחברות</h2>
        <p className="subtitle">משימות המשפחה — ניהול משק הבית ביחד</p>

        {error && <div className="error-banner">{error}</div>}
        {info && <div className="info-banner">{info}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">אימייל</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-block" type="submit" disabled={busy}>
            {busy ? 'מתחבר…' : 'התחברות'}
          </button>
        </form>

        <p className="auth-switch">
          <button
            className="btn-ghost btn btn-sm"
            type="button"
            onClick={handleForgot}
            disabled={busy}
          >
            שכחתי סיסמה
          </button>
        </p>

        <p className="auth-switch">
          אין לך חשבון?{' '}
          <Link to={`/register?redirect=${encodeURIComponent(redirect)}`}>
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  );
}

export function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'אימייל או סיסמה שגויים';
    case 'auth/email-already-in-use':
      return 'האימייל כבר רשום במערכת';
    case 'auth/weak-password':
      return 'הסיסמה חייבת להכיל לפחות 6 תווים';
    case 'auth/invalid-email':
      return 'כתובת אימייל לא תקינה';
    case 'auth/too-many-requests':
      return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר';
    case 'auth/network-request-failed':
      return 'בעיית רשת. בדוק את החיבור לאינטרנט ונסה שוב';
    default:
      if ((err as Error)?.message === 'timeout') {
        return 'החיבור לוקח יותר מדי זמן. בדוק את הרשת ונסה שוב';
      }
      return 'אירעה שגיאה. נסה שוב';
  }
}
