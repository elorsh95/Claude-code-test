import { Link } from 'react-router-dom';

/** דף נחיתה ציבורי (דף הבית) - נגיש ללא התחברות ומסביר את מטרת האפליקציה */
export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <img src="/icons/icon.svg" alt="משימות המשפחה" className="landing-logo" />
        <h1>משימות המשפחה</h1>
        <p className="landing-tagline">
          אפליקציה לניהול משימות משק הבית עבור כל המשפחה — במקום אחד, בשיתוף
          פעולה.
        </p>
        <div className="landing-cta">
          <Link className="btn" to="/login">
            התחברות
          </Link>
          <Link className="btn btn-secondary" to="/register">
            הרשמה
          </Link>
        </div>
      </header>

      <section className="landing-section">
        <h2>מה אפשר לעשות?</h2>
        <ul className="landing-features">
          <li>
            <span>✅</span>
            <div>
              <strong>יצירת משימות ושיוך אחראים</strong>
              <p>מי אחראי על מה, עם תאריכי יעד ועדיפות.</p>
            </div>
          </li>
          <li>
            <span>👨‍👩‍👧‍👦</span>
            <div>
              <strong>חשבון משפחתי עם הרשאות</strong>
              <p>הזמנת בני משפחה וקביעת תפקיד והרשאות לכל אחד.</p>
            </div>
          </li>
          <li>
            <span>🔁</span>
            <div>
              <strong>משימות חוזרות ותזכורות</strong>
              <p>מטלות קבועות מתגלגלות אוטומטית למחזור הבא.</p>
            </div>
          </li>
          <li>
            <span>🏆</span>
            <div>
              <strong>נקודות ולוח מובילים</strong>
              <p>תגמול על ביצוע משימות — כיף במיוחד עם ילדים.</p>
            </div>
          </li>
        </ul>
      </section>

      <section className="landing-section landing-how">
        <h2>איך זה עובד?</h2>
        <ol className="landing-steps">
          <li>נרשמים ויוצרים חשבון משפחתי</li>
          <li>מזמינים את בני המשפחה ומגדירים הרשאות</li>
          <li>יוצרים משימות, מבצעים, וצוברים נקודות</li>
        </ol>
        <div className="landing-cta" style={{ marginTop: '0.9rem' }}>
          <Link className="btn btn-block" to="/register">
            להתחלה — הרשמה חינם
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/privacy">מדיניות פרטיות</Link> ·{' '}
        <Link to="/terms">תנאי שימוש</Link>
        <div style={{ marginTop: '0.5rem' }}>
          © {'2026'} משימות המשפחה
        </div>
      </footer>
    </div>
  );
}
