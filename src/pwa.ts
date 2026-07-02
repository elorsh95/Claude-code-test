import { registerSW } from 'virtual:pwa-register';

// רישום ה-Service Worker עם עדכון אוטומטי + בדיקות עדכון תקופתיות.
// ב-iOS PWA (standalone) הדפדפן כמעט לא בודק עדכוני SW מעצמו, ולכן משתמשים
// נתקעים על גרסה ישנה מהקאש ("המלל לא השתנה"). כאן אנחנו יוזמים בדיקה כל דקה,
// וגם בכל חזרה לפוקוס/חזרה מרקע - וכשיש גרסה חדשה מרעננים אוטומטית.
const UPDATE_INTERVAL_MS = 60 * 1000;

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    const checkForUpdate = () => {
      // אל תבדוק כשאין רשת - זה סתם יזרוק שגיאה
      if (navigator.onLine === false) return;
      registration.update().catch(() => {
        /* מתעלמים - נסיון עדכון כושל לא אמור להפיל את האפליקציה */
      });
    };

    setInterval(checkForUpdate, UPDATE_INTERVAL_MS);

    // בדיקה בכל פעם שהמשתמש חוזר לאפליקציה (חזרה מרקע ב-iOS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.addEventListener('focus', checkForUpdate);
  },
  onNeedRefresh() {
    // registerType: 'autoUpdate' -> נטען מיד את הגרסה החדשה
    updateSW(true);
  },
});
