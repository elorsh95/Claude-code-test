import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { upsertUser } from '../lib/households';
import { toE164 } from '../lib/format';
import { mapAuthError } from '../lib/authErrors';

type Step = 'phone' | 'code' | 'name';

export function PhoneAuthPanel({ redirect }: { redirect: string }) {
  const navigate = useNavigate();
  const { reloadUser } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // reCAPTCHA גלוי (checkbox) - אמין ב-iOS, בניגוד ל-invisible שנכשל שם
  const [captchaSolved, setCaptchaSolved] = useState(false);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmRef = useRef<ConfirmationResult | null>(null);

  function resetVerifier() {
    try {
      verifierRef.current?.clear();
    } catch {
      /* ignore */
    }
    verifierRef.current = null;
    setCaptchaSolved(false);
  }

  function buildVerifier() {
    resetVerifier();
    const v = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'normal',
      callback: () => setCaptchaSolved(true),
      'expired-callback': () => setCaptchaSolved(false),
    });
    verifierRef.current = v;
    v.render().catch((err) => {
      console.error('reCAPTCHA render error:', err);
    });
  }

  // מרנדרים reCAPTCHA גלוי כשנמצאים במסך הזנת הטלפון
  useEffect(() => {
    if (step !== 'phone') return;
    buildVerifier();
    return () => resetVerifier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!verifierRef.current || !captchaSolved) return;
    setBusy(true);
    setError('');
    try {
      const e164 = toE164(phone);
      confirmRef.current = await signInWithPhoneNumber(
        auth,
        e164,
        verifierRef.current
      );
      setStep('code');
    } catch (err) {
      console.error('Phone auth error:', err);
      const code = (err as { code?: string })?.code ?? '';
      setError(`${mapAuthError(err)}${code ? ` [${code}]` : ''}`);
      // ה-token של reCAPTCHA נצרך - מרנדרים חדש כדי לאפשר ניסיון נוסף
      buildVerifier();
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmRef.current) return;
    setBusy(true);
    setError('');
    try {
      const cred = await confirmRef.current.confirm(code.trim());
      const u = cred.user;
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (!snap.exists() && !u.displayName) {
        // משתמש חדש - נבקש שם
        setStep('name');
      } else {
        await upsertUser({
          uid: u.uid,
          email: u.email ?? '',
          displayName: u.displayName ?? (u.phoneNumber ?? ''),
          phone: u.phoneNumber ?? undefined,
        });
        reloadUser();
        navigate(redirect, { replace: true });
      }
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      await upsertUser({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email ?? '',
        displayName: name.trim(),
        phone: auth.currentUser.phoneNumber ?? undefined,
      });
      reloadUser();
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      {step === 'phone' && (
        <form onSubmit={requestCode}>
          <div className="field">
            <label htmlFor="phone-auth">מספר טלפון</label>
            <input
              id="phone-auth"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="050-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* reCAPTCHA גלוי - יש לסמן לפני שליחת הקוד */}
          <div
            id="recaptcha-container"
            style={{
              display: 'flex',
              justifyContent: 'center',
              margin: '0.8rem 0',
            }}
          />

          <button
            className="btn btn-block"
            type="submit"
            disabled={busy || !captchaSolved || !phone.trim()}
          >
            {busy
              ? 'שולח קוד…'
              : captchaSolved
                ? 'שליחת קוד ב-SMS'
                : 'סמן שאינך רובוט כדי להמשיך'}
          </button>
          <p
            className="member-sub"
            style={{ textAlign: 'center', marginTop: '0.6rem' }}
          >
            אם ה-SMS לא מגיע, אפשר להתחבר עם אימייל או Google.
          </p>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode}>
          <div className="info-banner">שלחנו קוד אימות ל-{toE164(phone)}</div>
          <div className="field">
            <label htmlFor="sms-code">קוד האימות</label>
            <input
              id="sms-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button className="btn btn-block" type="submit" disabled={busy}>
            {busy ? 'מאמת…' : 'אימות והתחברות'}
          </button>
          <div className="modal-actions" style={{ marginTop: '0.6rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => {
                setStep('phone');
                setCode('');
                setError('');
              }}
            >
              שליחה חוזרת / שינוי מספר
            </button>
          </div>
        </form>
      )}

      {step === 'name' && (
        <form onSubmit={saveName}>
          <div className="info-banner">כמעט סיימנו! איך לקרוא לך?</div>
          <div className="field">
            <label htmlFor="phone-name">שם מלא</label>
            <input
              id="phone-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button
            className="btn btn-block"
            type="submit"
            disabled={busy || !name.trim()}
          >
            {busy ? 'שומר…' : 'סיום'}
          </button>
        </form>
      )}
    </>
  );
}
