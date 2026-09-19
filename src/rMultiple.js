/* ------------------------------------------------------------------
   rMultiple.js — R כמדד המרכזי של האפליקציה
     R מדויק  = פיפס ÷ מרחק הסטופ שנשמר על העסקה
     R מוערך  = פיפס ÷ חציון הסטופ ההיסטורי  (מסומן ב-~)
   ------------------------------------------------------------------ */

const PIP = { GBPJPY: 0.01, GBPUSD: 0.0001, EURUSD: 0.0001, USDJPY: 0.01, EURJPY: 0.01, XAUUSD: 0.1 };
const DEFAULT_SL = 35;      // גיבוי אחרון אם אין שום עסקה עם SL

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

/** חציון הסטופ מכל העסקאות שיש להן נתון */
export function medianSl(trades = []) {
  const v = trades.map(slPipsOf).filter((x) => x && x > 0).sort((a, b) => a - b);
  if (!v.length) return DEFAULT_SL;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * הקשר חישוב — נבנה פעם אחת מכל העסקאות ואז משמש לכל חישוב.
 *   const R = rContext(trades);
 *   R.of(trade)        -> { value, estimated }
 *   R.value(trade)     -> number
 *   R.fmt(trade)       -> "+2.15R" | "~+1.24R"
 */
export function rContext(allTrades = []) {
  const fallback = medianSl(allTrades);

  const of = (t) => {
    const pips = num(t.pips);
    if (pips === null) return { value: 0, estimated: true, missing: true };
    const sl = slPipsOf(t);
    if (sl) return { value: pips / sl, estimated: false, missing: false };
    return { value: pips / fallback, estimated: true, missing: false };
  };

  return {
    fallbackSl: fallback,
    of,
    value: (t) => of(t).value,
    exact: (t) => !of(t).estimated,
    fmt: (t, digits = 2) => {
      const { value, estimated } = of(t);
      return `${estimated ? '~' : ''}${value > 0 ? '+' : ''}${value.toFixed(digits)}R`;
    },
    /** כמה מהעסקאות ברשימה הן אומדן */
    estimatedCount: (list) => list.filter((t) => of(t).estimated).length,
    sum: (list) => list.reduce((s, t) => s + of(t).value, 0),
  };
}

/** פורמט למספר R בודד */
export const fmtR = (v, digits = 2, estimated = false) =>
  v === null || v === undefined
    ? '—'
    : `${estimated ? '~' : ''}${v > 0 ? '+' : ''}${v.toFixed(digits)}R`;

/* ------------------------------------------------------------------
   סיכומים
   ------------------------------------------------------------------ */
export function summarizeR(trades = [], R) {
  const ctx = R || rContext(trades);
  const rs = trades.map((t) => ctx.of(t).value);
  const wins = rs.filter((r) => r > 0);
  const lossesArr = rs.filter((r) => r < 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(lossesArr.reduce((a, b) => a + b, 0));
  const totalR = rs.reduce((a, b) => a + b, 0);
  return {
    count: trades.length,
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
export const WEEK_RULES = { maxTrades: 5, maxLosses: 3, maxPerDay: 2 };

export function weekStatus(data = {}, settings = {}) {
  const maxTrades = num(settings.maxTradesPerWeek) || WEEK_RULES.maxTrades;
  const maxLosses = num(settings.maxLossesPerWeek) || WEEK_RULES.maxLosses;

  const start = thisWeekStart();
  const trades = (data.trades || []).filter((t) => t.date >= start);
  const open = (data.openTrades || []).filter((t) => t.date >= start);

  const used = trades.length + open.length;
  const losses = trades.filter((t) => t.result === 'loss' || (num(t.pips) || 0) < 0).length;

  const R = rContext(data.trades || []);
  const s = summarizeR(trades, R);

  const reasons = [];
  if (used >= maxTrades) reasons.push(`${used} מתוך ${maxTrades} העסקאות לשבוע נוצלו`);
  if (losses >= maxLosses) reasons.push(`${losses} הפסדים השבוע — הכלל אומר לעצור`);

  return {
    weekStart: start,
    trades, open,
    used, maxTrades, remaining: Math.max(0, maxTrades - used),
    losses, maxLosses, lossesLeft: Math.max(0, maxLosses - losses),
    totalR: s.totalR,
    estimated: s.estimated,
    winRate: s.winRate,
    stopped: reasons.length > 0,
    reasons,
  };
}
