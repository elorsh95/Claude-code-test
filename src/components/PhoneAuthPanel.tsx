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
  const [resendIn, setResendIn] = useState(0);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmRef = useRef<ConfirmationResult | null>(null);

  // ספירה לאחור לשליחה חוזרת של הקוד
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  function getVerifier(): RecaptchaVerifier {
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
    return verifierRef.current;
  }

  function resetVerifier() {
    verifierRef.current?.clear();
    verifierRef.current = null;
  }

  async function requestCode() {
    setBusy(true);
    setError('');
    try {
      resetVerifier(); // reCAPTCHA חד-פעמי - יוצרים חדש בכל שליחה
      const e164 = toE164(phone);
      confirmRef.current = await signInWithPhoneNumber(
        auth,
        e164,
        getVerifier()
      );
      setStep('code');
      setResendIn(60);
    } catch (err) {
      setError(mapAuthError(err));
      resetVerifier();
    } finally {
      setBusy(false);
    }
  }

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    requestCode();
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
        <form onSubmit={sendCode}>
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
          <button className="btn btn-block" type="submit" disabled={busy}>
            {busy ? 'שולח קוד…' : 'שליחת קוד ב-SMS'}
          </button>
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
              disabled={busy || resendIn > 0}
              onClick={() => requestCode()}
            >
              {resendIn > 0 ? `שליחה חוזרת בעוד ${resendIn}s` : 'שליחה חוזרת'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => {
                setStep('phone');
                setCode('');
                setResendIn(0);
                resetVerifier();
              }}
            >
              שינוי מספר
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

      {/* מכל reCAPTCHA בלתי-נראה הנדרש לאימות טלפון */}
      <div id="recaptcha-container" />
    </>
  );
}
