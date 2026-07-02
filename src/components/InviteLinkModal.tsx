import { useState } from 'react';
import { Modal } from './Modal';
import { buildInviteLink } from '../lib/invitations';

interface Props {
  inviteId: string;
  householdName: string;
  role: string;
  onClose: () => void;
}

/** מציג קישור הזמנה קיים עם אפשרויות העתקה ושיתוף בוואטסאפ */
export function InviteLinkModal({ inviteId, householdName, role, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const link = buildInviteLink(inviteId);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('לא ניתן להעתיק אוטומטית — סמן והעתק ידנית');
    }
  }

  const waText = encodeURIComponent(
    `הוזמנת להצטרף ל"${householdName}" באפליקציית משימות המשפחה 🏠\n` +
      `הצטרפות בקישור: ${link}`
  );
  const waHref = `https://wa.me/?text=${waText}`;

  return (
    <Modal title="קישור ההזמנה" onClose={onClose}>
      <div className="info-banner">
        שתף את הקישור עם בן המשפחה. מי שיפתח אותו ויתחבר/יירשם — יצטרף לחשבון
        בתפקיד <strong>{role}</strong> עם ההרשאות שהגדרת.
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label>קישור ההזמנה</label>
        <input
          type="text"
          value={link}
          readOnly
          onFocus={(e) => e.target.select()}
        />
      </div>

      <div className="modal-actions">
        <a className="btn" href={waHref} target="_blank" rel="noreferrer">
          שיתוף בוואטסאפ
        </a>
        <button className="btn btn-secondary" type="button" onClick={copyLink}>
          {copied ? '✓ הועתק' : 'העתקת קישור'}
        </button>
      </div>

      <button
        className="btn btn-ghost btn-block"
        onClick={onClose}
        style={{ marginTop: '0.6rem' }}
      >
        סגירה
      </button>
    </Modal>
  );
}
