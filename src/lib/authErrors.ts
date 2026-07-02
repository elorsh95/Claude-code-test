/** מיפוי שגיאות Firebase Auth להודעות בעברית */
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
    case 'auth/invalid-phone-number':
      return 'מספר טלפון לא תקין';
    case 'auth/missing-phone-number':
      return 'יש להזין מספר טלפון';
    case 'auth/invalid-verification-code':
      return 'הקוד שהוזן שגוי';
    case 'auth/code-expired':
      return 'הקוד פג תוקף. שלח קוד חדש';
    case 'auth/quota-exceeded':
      return 'חרגת ממכסת ההודעות. נסה מאוחר יותר';
    // 503 משרתי ה-SMS של Firebase - תקלה זמנית בצד השירות, לא באפליקציה.
    // קורה בעיקר בשליחה למספרים אמיתיים בחלק מהמדינות/מפעילים.
    case 'auth/error-code:-39':
    case 'auth/internal-error':
      return 'שליחת ה-SMS אינה זמינה כרגע (תקלה זמנית בשירות). אפשר להתחבר עם אימייל או Google, או לנסות שוב מאוחר יותר';
    case 'auth/operation-not-allowed':
      return 'התחברות זו אינה מופעלת. יש להפעילה בקונסולת Firebase';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ההתחברות בוטלה';
    case 'auth/popup-blocked':
      return 'חלון ההתחברות נחסם. אפשר חלונות קופצים ונסה שוב';
    case 'auth/account-exists-with-different-credential':
      return 'כבר קיים חשבון עם האימייל הזה. התחבר עם אימייל וסיסמה, או הפעל קישור-חשבונות בקונסולה';
    case 'auth/unauthorized-domain':
      return 'הדומיין אינו מורשה. יש להוסיפו ב-Authorized domains בקונסולת Firebase';
    case 'auth/requires-recent-login':
      return 'מטעמי אבטחה יש להתחבר מחדש ואז לנסות שוב';
    case 'auth/billing-not-enabled':
      return 'שליחת SMS דורשת הפעלת חיוב (תוכנית Blaze) בקונסולת Firebase — או שימוש במספר בדיקה';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
    case 'auth/missing-app-credential':
      return 'אימות reCAPTCHA נכשל. רענן את הדף ונסה שוב';
    case 'auth/app-not-authorized':
      return 'הדומיין אינו מורשה לאימות טלפון';
    case 'auth/credential-already-in-use':
      return 'האימייל כבר משויך לחשבון אחר';
    default:
      if ((err as Error)?.message === 'timeout') {
        return 'החיבור לוקח יותר מדי זמן. בדוק את הרשת ונסה שוב';
      }
      // מצרפים את קוד השגיאה כדי להקל על אבחון תקלות
      return code ? `אירעה שגיאה: ${code}` : 'אירעה שגיאה. נסה שוב';
  }
}
