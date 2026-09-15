/* ------------------------------------------------------------------
   sessions.js — שיוך עסקה לסשן לפי שעון ישראל, עם קיץ/חורף אוטומטי
   שימוש: sessionOf("2026-09-15", "17:20")  ->  { key, name, ... }
   ------------------------------------------------------------------ */

export const SESSIONS = [
  { key: "asia",    name: "אסייתי",  color: "#f59e0b" },
  { key: "london",  name: "לונדון",  color: "#38bdf8" },
  { key: "overlap", name: "חפיפה",   full: "חפיפה לונדון–ניו יורק", color: "#22c55e" },
  { key: "ny",      name: "ניו יורק", color: "#a855f7" },
  { key: "off",     name: "מחוץ לסשן", color: "#8a7ba5" },
];

// חלונות לא-חופפים [key, משעה, עד שעה) בשעון ישראל המקומי
const WINDOWS = {
  summer: [["asia", 3, 9],  ["london", 9, 16],  ["overlap", 16, 18], ["ny", 18, 24]],
  winter: [["asia", 2, 10], ["london", 10, 16], ["overlap", 16, 19], ["ny", 19, 24]],
};

/* שעון קיץ בישראל: מהשישי שלפני יום ראשון האחרון במרץ, עד יום ראשון האחרון באוקטובר */
const lastSunday = (y, monthIdx) => {
  const d = new Date(Date.UTC(y, monthIdx + 1, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
};

export function isIsraelDST(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  const y = d.getUTCFullYear();
  const start = lastSunday(y, 2);            // יום ראשון אחרון במרץ
  start.setUTCDate(start.getUTCDate() - 2);  // השישי שלפניו
  const end = lastSunday(y, 9);              // יום ראשון אחרון באוקטובר
  return d >= start && d < end;
}

export function sessionOf(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [hh, mm] = timeStr.split(":");
  const h = parseInt(hh, 10) + (parseInt(mm, 10) || 0) / 60;
  if (!Number.isFinite(h)) return null;
  const table = WINDOWS[isIsraelDST(dateStr) ? "summer" : "winter"];
  const hit = table.find(([, from, to]) => h >= from && h < to);
  return SESSIONS.find((s) => s.key === (hit ? hit[0] : "off"));
}

/* החלון הפעיל כרגע — לשימוש בטאב "לפני" */
export function currentSession(now = new Date()) {
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  return sessionOf(date, time);
}
