# משימות המשפחה 🏠

אפליקציית PWA לניהול משימות ביתיות למשפחה: הרשמה והתחברות, חשבון משפחתי עם בעל חשבון (מנהל המשפחה),
הזמנת בני משפחה עם תפקיד/מעמד/הרשאות, יצירת משימות ושיוך אחראים, סימון ביצוע, והיסטוריה מלאה לכל משימה.

## תכולת שלב 1 (MVP)

- 🔐 **הרשמה והתחברות** (Firebase Authentication, אימייל + סיסמה)
- 👑 **חשבון משפחתי** — יוצר החשבון הופך אוטומטית ל**בעל החשבון / מנהל המשפחה** עם כל ההרשאות
- ✉️ **הזמנת בני משפחה** לפי אימייל, עם הגדרת **תפקיד**, **מעמד** ו**הרשאות** לכל אחד (כולל תבניות מוכנות)
- ✅ **משימות** — יצירה, עריכה, מחיקה, ושיוך של **אחראי אחד או כמה אחראים**
- ☑️ **סימון ביצוע** לפי הרשאה (כל משימה / רק משימות שהוקצו לי)
- ℹ️ **היסטוריית משימה** — לחיצה על אייקון ה-"i" בכל משימה פותחת ציר זמן: מי יצר ומתי, מי שייך, מי סימן כבוצעה וכו'
- 🛡️ **אכיפת הרשאות בשתי שכבות** — גם ב-UI וגם ב-Firestore Security Rules

## סטאק טכנולוגי

- React 18 + TypeScript + Vite
- vite-plugin-pwa (ניתן להתקנה בטלפון)
- react-router-dom
- Firebase (Auth + Firestore)

## הרצה מקומית

### אפשרות א' — מול Firebase Emulators (מומלץ לבדיקות, ללא צורך בפרויקט אמיתי)

דורש [Firebase CLI](https://firebase.google.com/docs/cli) ו-Java מותקנים.

```bash
npm install
cp .env.example .env.local        # ערוך והשאר VITE_USE_EMULATOR=true
npm run emulators                 # מפעיל Auth + Firestore emulators
npm run dev                       # בטרמינל נפרד
```

הגדר ב-`.env.local`:

```
VITE_USE_EMULATOR=true
```

שאר משתני ה-Firebase יכולים להישאר עם ערכי placeholder כשעובדים מול emulator.

### אפשרות ב' — מול פרויקט Firebase אמיתי

1. צור פרויקט חדש ב-[Firebase Console](https://console.firebase.google.com/) (חינמי).
2. הפעל **Authentication → Sign-in method → Email/Password**.
3. צור **Firestore Database** (Production mode).
4. ב-Project settings → Your apps → Web app, העתק את פרטי ה-SDK אל `.env.local` (ראה `.env.example`), והגדר `VITE_USE_EMULATOR=false`.
5. פרוס את חוקי האבטחה והאינדקסים:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
6. הרץ:
   ```bash
   npm install
   npm run dev
   ```

### בנייה ל-production

```bash
npm run build      # פלט בתיקיית dist/
npm run preview    # תצוגה מקדימה של ה-build
```

## מבנה הנתונים (Firestore)

```
users/{uid}
households/{hid}
households/{hid}/members/{uid}
households/{hid}/tasks/{tid}
households/{hid}/tasks/{tid}/history/{eid}
invitations/{invId}
```

## מודל ההרשאות

לכל חבר יש אובייקט `permissions`:

| הרשאה | משמעות |
|-------|--------|
| `canCreateTasks` | יצירת משימות |
| `canAssignTasks` | שיוך אחראים |
| `canEditTasks` | עריכת משימות |
| `canCompleteAnyTask` | סימון כל משימה כבוצעה (אחרת: רק משימות שהוקצו לו) |
| `canDeleteTasks` | מחיקת משימות |
| `canManageMembers` | הזמנה וניהול של בני המשפחה |

בעל החשבון (`isOwner`) מקבל את כל ההרשאות אוטומטית ואי אפשר לשלול ממנו.

## סביבות ולינקים

הפרויקט מארח **שני אתרי Hosting** באותו פרויקט Firebase (מסד נתונים והתחברות משותפים):

| סביבה | לינק | מתי מעדכנים |
|-------|------|-------------|
| 🔵 **dev** | https://household-tasks-587ef-dev.web.app | כל פיתוח מענף `claude/household-tasks-app-iheat4` |
| 🟢 **prod** | https://house-hold-tasks-587ef.web.app | רק אחרי אישור ומיזוג ל-`main` |

פקודות פריסה:
```bash
firebase deploy --only hosting:dev     # פריסת סביבת הפיתוח
firebase deploy --only hosting:prod    # פריסת סביבת הייצור (אחרי מיזוג ל-main)
```

> ⚠️ **הערה:** שתי הסביבות חולקות את אותו מסד נתונים (Firestore) והתחברות (Auth),
> לפי ההחלטה לעבוד עם פרויקט Firebase יחיד. כלומר הפרדה מלאה היא ברמת **הקוד/הלינק**,
> אך הנתונים משותפים. להפרדת נתונים מלאה יש להקים פרויקט Firebase נפרד ל-prod (הרחבה עתידית).

## תהליך עבודה: dev → main

> **חשוב:** כל פיתוח או שינוי קוד עולה קודם לסביבת **dev**,
> ורק לאחר אישור מפורש שהכול תקין — ממזגים ל-`main` ופורסים ל-prod.

1. פיתוח וקומיטים בענף `claude/household-tasks-app-iheat4`
2. פריסה ל-dev: `firebase deploy --only hosting:dev` → בדיקה בלינק ה-dev
3. לאחר אישור: מיזוג ל-`main`
4. פריסה ל-prod: `firebase deploy --only hosting:prod` → הלינק הציבורי מתעדכן

## הערות והרחבות עתידיות

- **שליחת מייל הזמנה בפועל** אינה כלולה בשלב זה — ההזמנה מותאמת לפי אימייל ומופיעה למוזמן בכניסה למערכת.
  שליחת מייל אמיתי תדרוש Cloud Function (הרחבה עתידית).
- **הקשחת צירוף-עצמי לחשבון**: חוקי האבטחה מונעים הענקת הרשאות בעלים בחשבון של אחר, אך אכיפת "קיום הזמנה תואמת"
  מלאה לצירוף-עצמי היא הקשחה עתידית (דורשת מזהי הזמנה דטרמיניסטיים או Cloud Function).
