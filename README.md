# יומן המשמעת — Trading Discipline Journal

אפליקציה לניהול יומן מסחר ומשמעת מנטלית. בנויה כ-PWA (Progressive Web App) — ניתן להתקין על הטלפון ולהשתמש כמו אפליקציה רגילה.

## תכונות
- ✅ צ׳קליסט לפני כניסה לעסקה (10 סעיפים)
- ✅ יומן אחרי עסקה עם ניתוח מנטלי
- ✅ תכנון ומעקב שבועי
- ✅ גרפים: Pie, פיפס מצטבר, פיפס שבועי, משמעת לאורך זמן
- ✅ עצירת 48 שעות אוטומטית בחריגה מהחוקים
- ✅ חסימה אוטומטית ב-100 פיפס שבועיים
- ✅ ייצוא/ייבוא גיבוי JSON
- ✅ שמירה מקומית ב-localStorage (לא נמחק)
- ✅ PWA — ניתן להוסיף למסך הבית

---

## הרצה מקומית

```bash
npm install
npm start
```

האפליקציה תיפתח ב-http://localhost:3000

---

## פריסה ל-Vercel (חינמי, 5 דקות)

### שלב 1: העלה ל-GitHub
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trading-journal.git
git push -u origin main
```

### שלב 2: חבר ל-Vercel
1. כנס ל-[vercel.com](https://vercel.com) והירשם עם GitHub
2. לחץ "Add New Project"
3. בחר את ה-repository שיצרת
4. Framework Preset: **Create React App**
5. לחץ "Deploy"

Vercel יבנה ויפרוס אוטומטית. תקבל URL ציבורי.

### שלב 3: התקן כאפליקציה בטלפון
**אייפון (Safari):**
1. פתח את ה-URL ב-Safari
2. לחץ על כפתור השיתוף ↑
3. "הוסף למסך הבית"

**אנדרואיד (Chrome):**
1. פתח את ה-URL ב-Chrome
2. לחץ על 3 הנקודות ⋮
3. "הוסף למסך הבית" / "התקן אפליקציה"

---

## גיבוי נתונים

הנתונים נשמרים ב-localStorage של הדפדפן.
- **ייצוא**: טאב "חוקים" → "ייצא גיבוי JSON"
- **ייבוא**: טאב "חוקים" → "ייבא גיבוי"

מומלץ לגבות כל שבוע.

---

## מבנה הפרויקט

```
src/
  App.jsx          # אפליקציה ראשית + header
  storage.js       # localStorage + export/import
  theme.js         # צבעים
  components/
    UI.jsx         # רכיבי UI בסיסיים
    PreTrade.jsx   # צ׳קליסט לפני עסקה
    PostTrade.jsx  # יומן אחרי עסקה
    Weekly.jsx     # מעקב שבועי
    Performance.jsx # גרפים וביצועים
    Rules.jsx      # חוקים + ניהול נתונים
```
