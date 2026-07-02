import { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { updateMemberName } from '../lib/members';
import { mapAuthError } from '../lib/authErrors';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';

export function AccountModal({ onClose }: { onClose: () => void }) {
  const {
    user,
    setAccountPassword,
    hasPasswordProvider,
    updateDisplayName,
    logout,
  } = useAuth();
  const { activeHousehold, currentMember } = useHousehold();
  const hasPassword = hasPasswordProvider();
  const [name, setName] = useState(user?.displayName ?? '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameDone, setNameDone] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [theme, setTheme] = useState<ThemePref>(getThemePref());

  function chooseTheme(t: ThemePref) {
    setTheme(t);
    setThemePref(t);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setNameBusy(true);
    setError('');
    setNameDone(false);
    try {
      await updateDisplayName(name.trim());
      // עדכון שם התצוגה גם ברשומת החבר בחשבון הפעיל
      if (activeHousehold && currentMember) {
        await updateMemberName(activeHousehold.id, user.uid, name.trim());
      }
      setNameDone(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setNameBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setAccountPassword(password);
      setDone(true);
      setPassword('');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="הגדרות חשבון" onClose={onClose}>
      <div className="field">
        <label>מחובר כ</label>
        {user?.email && <div className="member-sub">{user.email}</div>}
        {user?.phone && <div className="member-sub">{user.phone}</div>}
      </div>

      {nameDone && <div className="info-banner">השם עודכן!</div>}
      <form onSubmit={handleSaveName}>
        <div className="field">
          <label htmlFor="disp-name">השם שלי</label>
          <input
            id="disp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button
          className="btn btn-block"
          type="submit"
          disabled={nameBusy || !name.trim() || name.trim() === user?.displayName}
        >
          {nameBusy ? 'שומר…' : 'עדכון השם'}
        </button>
      </form>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

      <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
        {hasPassword ? 'שינוי סיסמה' : 'הגדרת סיסמה'}
      </h4>
      <p className="member-sub" style={{ marginBottom: '0.8rem' }}>
        {hasPassword
          ? 'עדכון הסיסמה להתחברות עם אימייל.'
          : 'קבע סיסמה כדי שתוכל להתחבר גם עם אימייל וסיסמה (בנוסף ל-Google).'}
      </p>

      {done && (
        <div className="info-banner">
          הסיסמה נשמרה! עכשיו אפשר להתחבר גם עם אימייל וסיסמה.
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      {user?.email ? (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="new-pass">
              {hasPassword ? 'סיסמה חדשה' : 'סיסמה'}
            </label>
            <input
              id="new-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="לפחות 6 תווים"
              required
            />
          </div>
          <button
            className="btn btn-block"
            type="submit"
            disabled={busy || password.length < 6}
          >
            {busy ? 'שומר…' : hasPassword ? 'עדכון סיסמה' : 'קביעת סיסמה'}
          </button>
        </form>
      ) : (
        <div className="info-banner">
          לחשבון זה אין אימייל, לכן לא ניתן לקבוע סיסמה.
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

      <div className="field">
        <label>מראה</label>
        <div className="filter-tabs">
          <button
            type="button"
            className={theme === 'system' ? 'active' : ''}
            onClick={() => chooseTheme('system')}
          >
            🖥️ מערכת
          </button>
          <button
            type="button"
            className={theme === 'light' ? 'active' : ''}
            onClick={() => chooseTheme('light')}
          >
            ☀️ בהיר
          </button>
          <button
            type="button"
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => chooseTheme('dark')}
          >
            🌙 כהה
          </button>
        </div>
      </div>

      <button
        className="btn btn-ghost btn-block"
        onClick={() => logout()}
        style={{ marginTop: '1rem' }}
      >
        התנתקות
      </button>
    </Modal>
  );
}
