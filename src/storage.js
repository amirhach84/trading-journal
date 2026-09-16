const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const LOCAL_KEY  = 'trading_discipline_v1';
const RESCUE_KEY = 'trading_discipline_rescue';

export const defaultState = {
  trades: [],
  openTrades: [],
  weeklyPlans: [],
  dailyLogs: [],
  cooldownUntil: null,
};

/* ------------------------------------------------------------------
   מצב מודול — השומרים שמונעים דריסה
   ------------------------------------------------------------------ */
let ready = false;        // האם הטעינה מהשרת הסתיימה בהצלחה
let lastCount = 0;        // כמה עסקאות אנחנו יודעים שיש בשרת
let lastError = null;     // השגיאה האחרונה, להצגה למשתמש
let lastSnapshotAt = 0;   // מתי נשמר snapshot אחרון
let blockedSave = null;   // שמירה שנחסמה, לשחרור ידני

const SHRINK_TOLERANCE = 5;        // ירידה גדולה מזה נחסמת
const SNAPSHOT_INTERVAL = 10 * 60 * 1000;

const countTrades = (d) => (d && Array.isArray(d.trades) ? d.trades.length : 0);

export function getStatus() {
  let hasRescue = false;
  try { hasRescue = !!localStorage.getItem(RESCUE_KEY); } catch {}
  return { ready, lastCount, lastError, hasRescue, blocked: !!blockedSave };
}

/* ------------------------------------------------------------------
   אחסון מקומי
   ------------------------------------------------------------------ */
export function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch { return null; }
}

export function saveLocal(data) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {}
}

/** עותק חילוץ — נשמר כשהשרת מחזיר פחות ממה שיש מקומית */
export function loadRescue() {
  try {
    const raw = localStorage.getItem(RESCUE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearRescue() {
  try { localStorage.removeItem(RESCUE_KEY); } catch {}
}

/* ------------------------------------------------------------------
   Supabase
   ------------------------------------------------------------------ */
async function sb(path, method, body, prefer) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  if (prefer === 'return=minimal') return null;
  return res.json();
}

export async function loadFromCloud() {
  try {
    const rows = await sb('journal_data?id=eq.main', 'GET');
    if (!rows || rows.length === 0) return null;
    lastError = null;
    return { ...defaultState, ...rows[0].data };
  } catch (e) {
    lastError = `טעינה מהשרת נכשלה: ${e.message}`;
    console.warn(lastError);
    return null;
  }
}

async function saveToCloud(data) {
  try {
    await sb('journal_data?id=eq.main', 'PATCH',
      { data, updated_at: new Date().toISOString() }, 'return=minimal');
    lastError = null;
    maybeSnapshot(data);
  } catch (e) {
    lastError = `שמירה לשרת נכשלה: ${e.message}`;
    console.warn(lastError);
  }
}

/* ------------------------------------------------------------------
   Snapshots — היסטוריית גרסאות
   ------------------------------------------------------------------ */
async function maybeSnapshot(data) {
  const now = Date.now();
  if (now - lastSnapshotAt < SNAPSHOT_INTERVAL) return;
  lastSnapshotAt = now;
  try {
    await sb('journal_snapshots', 'POST',
      { data, trade_count: countTrades(data) }, 'return=minimal');
  } catch (e) {
    console.warn('snapshot failed:', e.message);
  }
}

/** רשימת הגרסאות השמורות, החדשה ראשונה */
export async function listSnapshots() {
  try {
    return await sb(
      'journal_snapshots?select=id,trade_count,created_at&order=created_at.desc&limit=30',
      'GET'
    );
  } catch (e) {
    lastError = `טעינת גרסאות נכשלה: ${e.message}`;
    return [];
  }
}

/** שליפת תוכן גרסה לפי id */
export async function getSnapshot(id) {
  const rows = await sb(`journal_snapshots?id=eq.${id}&select=data`, 'GET');
  if (!rows || !rows.length) throw new Error('הגרסה לא נמצאה');
  return { ...defaultState, ...rows[0].data };
}

/* ------------------------------------------------------------------
   טעינה ושמירה — עם השומרים
   ------------------------------------------------------------------ */
export async function loadData() {
  const local = loadLocal();
  const cloud = await loadFromCloud();

  if (cloud) {
    // אם מקומית יש יותר עסקאות מאשר בשרת — שומרים עותק חילוץ לפני הדריסה
    if (local && countTrades(local) > countTrades(cloud) + 2) {
      try { localStorage.setItem(RESCUE_KEY, JSON.stringify(local)); } catch {}
      console.warn(
        `עותק מקומי עם ${countTrades(local)} עסקאות מול ${countTrades(cloud)} בשרת — נשמר עותק חילוץ`
      );
    }
    saveLocal(cloud);
    lastCount = countTrades(cloud);
    ready = true;               // מכאן ואילך שמירה מותרת
    return cloud;
  }

  // השרת לא זמין — עובדים מקומית, אבל שמירה לשרת חסומה
  ready = false;
  if (local && countTrades(local) > 0) return local;
  return defaultState;
}

/**
 * שמירה. מקומית תמיד; לשרת רק אם:
 *   1. הטעינה הראשונית הסתיימה בהצלחה
 *   2. מספר העסקאות לא צנח בצורה חשודה
 * options.force מדלג על בדיקה 2 בלבד.
 */
export function saveData(data, options = {}) {
  saveLocal(data);

  if (!ready) {
    lastError = 'השמירה לשרת נדחתה — הטעינה מהשרת עוד לא הסתיימה או נכשלה. רענן את הדף.';
    console.warn(lastError);
    return false;
  }

  const n = countTrades(data);
  if (!options.force && lastCount > 0 && lastCount - n > SHRINK_TOLERANCE) {
    blockedSave = data;
    lastError = `השמירה נחסמה: ${n} עסקאות מול ${lastCount} בשרת. אם זה מכוון, אשר ידנית.`;
    console.warn(lastError);
    return false;
  }

  blockedSave = null;
  lastCount = n;
  saveToCloud(data);
  return true;
}

/** אישור ידני של שמירה שנחסמה */
export function confirmBlockedSave() {
  if (!blockedSave) return false;
  const d = blockedSave;
  blockedSave = null;
  return saveData(d, { force: true });
}

/* ------------------------------------------------------------------
   ייצוא / ייבוא
   ------------------------------------------------------------------ */
export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading-journal-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed.trades)) throw new Error('חסר מערך trades');
      onSuccess({ ...defaultState, ...parsed });
    } catch (err) {
      onError('קובץ לא תקין: ' + err.message);
    }
  };
  reader.readAsText(file);
}
