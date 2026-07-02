import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { acceptInvitation, getInvitation } from '../lib/invitations';
import type { Invitation } from '../types';

export function JoinPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const redirect = `/join/${inviteId}`;

  useEffect(() => {
    if (!inviteId) return;
    getInvitation(inviteId)
      .then(setInvite)
      .catch(() => setError('שגיאה בטעינת ההזמנה'))
      .finally(() => setLoading(false));
  }, [inviteId]);

  async function handleJoin() {
    if (!user || !invite) return;
    setBusy(true);
    setError('');
    try {
      await acceptInvitation(invite, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהצטרפות');
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src="/icons/icon.svg" alt="" className="auth-logo" />

        {!invite || invite.status !== 'pending' ? (
          <>
            <h2>ההזמנה לא זמינה</h2>
            <p className="subtitle">
              {invite && invite.status !== 'pending'
                ? 'הזמנה זו כבר נוצלה או בוטלה.'
                : 'הקישור אינו תקין או שההזמנה הוסרה.'}
            </p>
            <Link className="btn btn-block" to="/">
              למסך הראשי
            </Link>
          </>
        ) : (
          <>
            <h2>הזמנה להצטרפות 🎉</h2>
            <p className="subtitle">
              הוזמנת ע"י {invite.invitedByName} להצטרף אל
              <br />
              <strong>{invite.householdName}</strong>
              <br />
              בתפקיד: {invite.role}
              {invite.position ? ` · ${invite.position}` : ''}
            </p>

            {error && <div className="error-banner">{error}</div>}

            {user ? (
              <button
                className="btn btn-block"
                onClick={handleJoin}
                disabled={busy}
              >
                {busy ? 'מצטרף…' : `הצטרפות בתור ${user.displayName}`}
              </button>
            ) : (
              <>
                <div className="info-banner">
                  כדי להצטרף, התחבר או הירשם תחילה.
                </div>
                <Link
                  className="btn btn-block"
                  to={`/register?redirect=${encodeURIComponent(redirect)}`}
                >
                  הרשמה
                </Link>
                <p className="auth-switch">
                  כבר יש לך חשבון?{' '}
                  <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>
                    התחברות
                  </Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
