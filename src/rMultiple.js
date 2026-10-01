/* ------------------------------------------------------------------
   rMultiple.js — R כמדד המרכזי של האפליקציה

     1R = |Entry − SL|      יחידת הסיכון של העסקה
     R  = פיפס בפועל ÷ 1R

   SL מוטרג -> -1R  ·  TP ב-1:2 -> +2R  ·  סגירה באמצע -> יחסי

   בלי Entry ו-SL אין R. המודול מחזיר null ולא ממציא מספר,
   והתצוגה נופלת לפיפס.
   ------------------------------------------------------------------ */

/**
 * מאיזה תאריך R הוא מדד אמין.
 * לפני כן לא נשמרו סטופים מתוכננים ולא היה שדה מחיר יציאה,
 * ולכן כל העסקאות הישנות נמדדות בפיפס בלבד.
 */
export const R_START = '2026-04-07';

export const isLegacy = (t) => !t || !t.date || t.date < R_START;

const PIP = { GBPJPY: 0.01, GBPUSD: 0.0001, EURUSD: 0.0001, USDJPY: 0.01, EURJPY: 0.01, XAUUSD: 0.1 };

const num = (v) => {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(x) ? x : null;
};

export const pipSize = (pair) => PIP[pair] || 0.01;

/** מרחק הסטופ בפיפס — מהשדה השמור או מהפרש כניסה-סטופ */
export function slPipsOf(t) {
  const direct = num(t.slPips);
  if (direct && direct > 0) return direct;
  const e = num(t.entry), s = num(t.sl);
  if (e !== null && s !== null && e !== s) {
    const d = Math.abs(e - s) / pipSize(t.pair);
    return d > 0 ? d : null;
  }
  return null;
}

/** מרחק ה-TP בפיפס, אם הוזן */
export function tpPipsOf(t) {
  const direct = num(t.tpPips);
  if (direct && direct > 0) return direct;
  const e = num(t.entry), tp = num(t.tp);
  if (e !== null && tp !== null && e !== tp) {
    const d = Math.abs(e - tp) / pipSize(t.pair);
    return d > 0 ? d : null;
  }
  return null;
}

/** היחס המתוכנן, TP ÷ SL. בעסקת 1:2 יחזיר 2 */
export function plannedRR(t) {
  const sl = slPipsOf(t), tp = tpPipsOf(t);
  return sl && tp ? tp / sl : null;
}

/** R בפועל, או null אם אין Entry ו-SL */
export function rOf(t) {
  const sl = slPipsOf(t);
  const pips = num(t.pips);
  if (!sl || pips === null) return null;
  return pips / sl;
}

/**
 * הקשר חישוב — נבנה פעם אחת מכל העסקאות ואז משמש לכל חישוב.
 *   const R = rContext(trades);
 *   R.of(trade)        -> { value, estimated }
 *   R.value(trade)     -> number
 *   R.fmt(trade)       -> "+2.15R" | "~+1.24R"
 */
export function rContext() {
  const of = (t) => {
    // עסקאות מלפני R_START נמדדות בפיפס בלבד
    if (isLegacy(t)) return { value: 0, hasR: false, legacy: true, trailed: false, issues: [], planned: null };
    if (stopWasTrailed(t)) return { value: 0, hasR: false, legacy: false, trailed: true, issues: [], planned: plannedRR(t) };
    const r = rOf(t);
    if (r === null) return { value: 0, hasR: false, legacy: false, issues: dataIssues(t), planned: plannedRR(t) };
    const issues = dataIssues(t);
    if (issues.length) return { value: 0, hasR: false, legacy: false, issues, planned: plannedRR(t) };
    return { value: r, hasR: true, legacy: false, issues: [], planned: plannedRR(t) };
  };

  return {
    of,
    /** R לחישובים. 0 לעסקה בלי SL — היא פשוט לא נספרת ב-R */
    value: (t) => of(t).value,
    hasR: (t) => of(t).hasR,
    /** תצוגה: R כשניתן, אחרת פיפס */
    fmt: (t, digits = 2) => {
      const { value, hasR } = of(t);
      if (!hasR) {
        const p = num(t.pips) || 0;
        return `${p > 0 ? '+' : ''}${p.toFixed(0)}p`;
      }
      return `${value > 0 ? '+' : ''}${value.toFixed(digits)}R`;
    },
    /** עסקאות מהתקופה החדשה שעדיין אין להן R תקין */
    missingCount: (list) => list.filter((t) => !of(t).hasR && !of(t).legacy).length,
    estimatedCount: (list) => list.filter((t) => !of(t).hasR && !of(t).legacy).length,
    legacyCount: (list) => list.filter((t) => of(t).legacy).length,
    sum: (list) => list.reduce((s, t) => (of(t).hasR ? s + of(t).value : s), 0),
    /** { r, withR, count } — תמיד מחזיר גם את הכיסוי */
    trailedCount: (list) => list.filter((t) => of(t).trailed).length,
    coverage: (list) => {
      const w = list.filter((t) => of(t).hasR);
      const legacy = list.filter((t) => of(t).legacy);
      const trailed = list.filter((t) => of(t).trailed);
      const modern = list.filter((t) => !of(t).legacy);
      return {
        r: w.reduce((s, t) => s + of(t).value, 0),
        withR: w.length,
        count: list.length,
        legacy: legacy.length,
        trailed: trailed.length,
        modern: modern.length,
        /** האם כל העסקאות בקבוצה הן מהתקופה הישנה */
        allLegacy: modern.length === 0,
        complete: w.length === modern.length && modern.length > 0,
        pips: list.reduce((a, t) => a + (num(t.pips) || 0), 0),
      };
    },
  };
}

/** פורמט למספר R בודד */
export const fmtR = (v, digits = 2, partial = false) =>
  v === null || v === undefined
    ? '—'
    : `${v > 0 ? '+' : ''}${v.toFixed(digits)}R${partial ? '*' : ''}`;

/* ------------------------------------------------------------------
   בדיקת תקינות הרמות
   Long : SL מתחת לכניסה, TP מעליה
   Short: SL מעל הכניסה, TP מתחתיה
   ------------------------------------------------------------------ */
export function validateLevels({ entry, sl, tp, direction }) {
  const e = num(entry), s = num(sl), p = num(tp);
  const long = !String(direction || 'long').toLowerCase().startsWith('s');
  const errors = [];

  if (e !== null && s !== null && e !== s) {
    if (long && s > e) errors.push('בעסקת Long הסטופ חייב להיות מתחת למחיר הכניסה. נראה שהזנת כאן את מחיר היציאה.');
    if (!long && s < e) errors.push('בעסקת Short הסטופ חייב להיות מעל מחיר הכניסה. נראה שהזנת כאן את מחיר היציאה.');
  }
  if (e !== null && p !== null && e !== p) {
    if (long && p < e) errors.push('בעסקת Long המטרה חייבת להיות מעל מחיר הכניסה.');
    if (!long && p > e) errors.push('בעסקת Short המטרה חייבת להיות מתחת למחיר הכניסה.');
  }
  return errors;
}

/** פיפס בפועל ממחיר כניסה ויציאה */
export function pipsFromExit({ entry, exitPrice, direction, pair }) {
  const e = num(entry), x = num(exitPrice);
  if (e === null || x === null) return null;
  const long = !String(direction || 'long').toLowerCase().startsWith('s');
  const raw = long ? x - e : e - x;
  return +(raw / pipSize(pair)).toFixed(1);
}

/* ------------------------------------------------------------------
   איכות נתונים — עסקאות שה-R שלהן לא אמין
   ------------------------------------------------------------------ */
export const MIN_SANE_SL = 10;     // סטופ קטן מזה כמעט בוודאות שגיאת הזנה

/**
 * האם הסטופ הוזז לתוך הרווח.
 * ב-MT5 נשמר מיקום הסטופ הסופי, ולכן בעסקה רווחית שבה הסטופ
 * נמצא בצד ה"לא נכון" מדובר בסטופ שהוזז — לא בשגיאה.
 * במקרה כזה אין דרך לחלץ את הסיכון המקורי, ולכן אין R.
 */
export function stopWasTrailed(t) {
  const e = num(t.entry), s = num(t.sl), pips = num(t.pips);
  if (e === null || s === null || pips === null || pips <= 0) return false;
  const long = !String(t.direction || 'long').toLowerCase().startsWith('s');
  return long ? s >= e : s <= e;
}

export function dataIssues(t) {
  // סטופ שהוזז לרווח אינו תקלה — פשוט אין ממנו R
  if (stopWasTrailed(t)) return [];

  const out = [];
  const sl = slPipsOf(t);
  const pips = num(t.pips);
  out.push(...validateLevels(t));

  if (sl && pips !== null) {
    if (pips > 0 && Math.abs(pips - sl) < 0.6)
      out.push('עסקה רווחית לא יכולה לצאת במחיר הסטופ — נראה שבשדה ה-SL נשמר מחיר היציאה.');
    if (sl < MIN_SANE_SL)
      out.push(`מרחק הסטופ ${sl.toFixed(1)} פיפס בלבד — כמעט בוודאות שגיאת הזנה.`);
  }
  return out;
}

/** האם ה-R של העסקה אמין מספיק להיכנס לסכומים */
export const rTrustworthy = (t) => dataIssues(t).length === 0;

/** כל העסקאות שדורשות תיקון, עם הסיבות */
export function tradesNeedingFix(trades = []) {
  return trades
    .filter((t) => !isLegacy(t))
    .map((t) => ({ trade: t, issues: dataIssues(t) }))
    .filter((x) => x.issues.length > 0);
}

/* ------------------------------------------------------------------
   סיכומים
   ------------------------------------------------------------------ */
export function summarizeR(trades = [], R) {
  const ctx = R || rContext(trades);
  // רק עסקאות שיש להן Entry ו-SL נכנסות לחישוב R
  const withR = trades.filter((t) => ctx.of(t).hasR);
  const rs = withR.map((t) => ctx.of(t).value);
  const wins = rs.filter((r) => r > 0);
  const lossesArr = rs.filter((r) => r < 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(lossesArr.reduce((a, b) => a + b, 0));
  const totalR = rs.reduce((a, b) => a + b, 0);
  return {
    count: trades.length,
    withR: withR.length,
    missing: trades.length - withR.length,
    /** האם ה-R מכסה את כל העסקאות בקבוצה */
    complete: withR.length === trades.length,
    /** סך הפיפס — המדד שכן קיים על כל עסקה */
    totalPips: trades.reduce((a, t) => a + (num(t.pips) || 0), 0),
    estimated: ctx.estimatedCount(trades),
    totalR,
    avgR: rs.length ? totalR / rs.length : null,
    bestR: rs.length ? Math.max(...rs) : null,
    worstR: rs.length ? Math.min(...rs) : null,
    wins: wins.length,
    losses: lossesArr.length,
    winRate: rs.length ? (wins.length / rs.length) * 100 : null,
    avgWinR: wins.length ? grossWin / wins.length : null,
    avgLossR: lossesArr.length ? -grossLoss / lossesArr.length : null,
    profitFactor: grossLoss ? grossWin / grossLoss : (grossWin ? Infinity : null),
  };
}

/* ------------------------------------------------------------------
   זמן
   ------------------------------------------------------------------ */
export function weekStartOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return null;
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const monthKeyOf = (dateStr) => (dateStr || '').slice(0, 7);

export function thisWeekStart() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function groupR(trades = [], keyFn, R) {
  const ctx = R || rContext(trades);
  const map = new Map();
  for (const t of trades) {
    const k = keyFn(t);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  return [...map.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([key, list]) => ({ key, trades: list, ...summarizeR(list, ctx) }));
}

/* ------------------------------------------------------------------
   חוקי השבוע: 5 עסקאות מקסימום, עצירה ב-3 הפסדים
   ------------------------------------------------------------------ */
export const WEEK_RULES = {
  /** כמה ימי מסחר מפסידים ברצף סוגרים את המסחר */
  losingDayStreak: 3,
  /** מגבלה יומית, לא שבועית */
  maxPerDay: 2,
};

const DAY = 864e5;
const toDay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
const dayStr = (ms) => new Date(ms).toISOString().slice(0, 10);

/** יום שני של השבוע שבו נמצא התאריך */
const mondayOf = (ms) => {
  const dow = new Date(ms).getUTCDay();      // 0=ראשון … 6=שבת
  return ms - ((dow + 6) % 7) * DAY;         // כמה ימים אחורה עד יום שני
};

/** יום שני של השבוע שאחרי — כאן המסחר נפתח מחדש */
export const nextMonday = (ms) => mondayOf(ms) + 7 * DAY;

/**
 * מאתר את רצף ימי המסחר המפסידים האחרון.
 * "ימים רצופים" = ימי מסחר עוקבים, לא ימי לוח.
 * מחזיר { days, lastDay } או null.
 */
export function losingStreak(trades = [], need = WEEK_RULES.losingDayStreak) {
  const byDay = new Map();
  for (const t of trades) {
    const k = t.closeDate || t.date;
    if (!k) continue;
    byDay.set(k, (byDay.get(k) || 0) + (num(t.pips) || 0));
  }
  const days = [...byDay.keys()].sort();
  let run = [];
  let last = null;
  for (const d of days) {
    if (byDay.get(d) < 0) {
      run.push(d);
      if (run.length >= need) last = [...run];
    } else {
      run = [];
    }
  }
  return last ? { days: last, lastDay: last[last.length - 1] } : null;
}

/**
 * מצב המסחר. אין יותר תקרת עסקאות שבועית —
 * הכלל היחיד הוא רצף של ימי מסחר מפסידים.
 */
export function weekStatus(data = {}, settings = {}) {
  const need = num(settings.losingDayStreak) || WEEK_RULES.losingDayStreak;

  const start = thisWeekStart();
  const all = data.trades || [];
  const trades = all.filter((t) => (t.closeDate || t.date) >= start);
  const open = (data.openTrades || []).filter((t) => t.date >= start);

  const used = trades.length + open.length;
  const losses = trades.filter((t) => t.result === 'loss' || (num(t.pips) || 0) < 0).length;

  const R = rContext();
  const s = summarizeR(trades, R);

  // רצף ימי ההפסד האחרון. הנעילה היא עד תחילת השבוע הבא —
  // רצף שנגמר ביום חמישי נפתח ביום שני, לא שבעה ימים קדימה.
  const streak = losingStreak(all, need);
  const todayMs = toDay(new Date().toISOString().slice(0, 10));
  let lockedUntil = null, daysLeft = 0;
  if (streak) {
    const endMs = toDay(streak.lastDay);
    if (endMs !== null && todayMs !== null) {
      const until = nextMonday(endMs);
      if (todayMs < until) {
        lockedUntil = dayStr(until);
        daysLeft = Math.round((until - todayMs) / DAY);
      }
    }
  }

  const reasons = [];
  if (lockedUntil) {
    reasons.push(`${need} ימי מסחר מפסידים ברצף: ${streak.days.join(' · ')}`);
    reasons.push(`המסחר נפתח ביום שני ${lockedUntil}`);
  }

  return {
    weekStart: start,
    trades, open,
    used, losses,
    totalR: s.totalR,
    estimated: s.estimated,
    winRate: s.winRate,
    streak, need,
    lockedUntil, daysLeft,
    stopped: !!lockedUntil,
    reasons,
  };
}
