/* ------------------------------------------------------------------
   accountBalance.js
   ברוטו = איכות המסחר (פיפס).  נטו = מה שנכנס לחשבון (אחרי עלויות).
   יתרה = אירועי חשבון + סך הנטו של עסקאות סגורות.
   ------------------------------------------------------------------ */

export const EVENT_TYPES = {
  deposit:    { key: "deposit",    label: "הפקדה", sign: 1 },
  withdrawal: { key: "withdrawal", label: "משיכה", sign: -1 },
  adjustment: { key: "adjustment", label: "תיקון", sign: 1 },  // דלתא, יכול להיות שלילי
};

const num = (v) => { const x = typeof v === "number" ? v : parseFloat(v); return Number.isFinite(x) ? x : null; };

export const isClosed = (t) =>
  t.status ? t.status !== "open" : (t.closed ?? (t.pips != null || t.pnl != null || t.result != null));

/** רווח ברוטו בדולר — לפני עמלות. מחושב מהפיפס ומשווי הפיפ שננעל בכניסה. */
export function grossOf(t) {
  const direct = num(t.grossUsd);
  if (direct != null) return direct;
  const pips = num(t.pips ?? t.resultPips ?? t.netPips);
  const pv = num(t.pipValueAtEntry);
  const lots = num(t.lots);
  if (pips != null && pv != null && lots != null) return pips * pv * lots;
  // גיבוי אחרון: אם נשמר רק סכום כולל מהברוקר
  return num(t.pnl ?? t.profit ?? t.result) ?? 0;
}

/** עמלה + swap. שניהם נשמרים כשליליים (עלות). */
export function costsOf(t, settings = {}) {
  const swap = num(t.swap) ?? 0;
  const explicit = num(t.commission);
  const lots = num(t.lots) ?? 0;
  const perLot = num(settings.commissionPerLot) ?? 0;
  const commission = explicit != null ? explicit : -(lots * perLot);
  return { swap, commission, total: swap + commission };
}

/** מה שבאמת נכנס לחשבון */
export function netOf(t, settings = {}) {
  return grossOf(t) + costsOf(t, settings).total;
}

const amountOf = (e) => {
  const a = num(e.amount) ?? 0;
  const sign = (EVENT_TYPES[e.type] || EVENT_TYPES.deposit).sign;
  return e.type === "adjustment" ? a : sign * Math.abs(a);
};

const dateOf = (x) => x.date || x.closeDate || x.openDate || "";

/** היתרה הנוכחית, עם פירוק לשורות של דוח עסקי */
export function computeBalance(events = [], trades = [], settings = {}) {
  const cash = events.reduce((s, e) => s + amountOf(e), 0);
  const closed = trades.filter(isClosed);
  const gross = closed.reduce((s, t) => s + grossOf(t), 0);
  const swap = closed.reduce((s, t) => s + costsOf(t, settings).swap, 0);
  const commission = closed.reduce((s, t) => s + costsOf(t, settings).commission, 0);
  const net = gross + swap + commission;
  return { balance: cash + net, netDeposited: cash, gross, swap, commission,
           costs: swap + commission, tradingPnl: net };
}

export function balanceAsOf(dateStr, events = [], trades = [], settings = {}) {
  return computeBalance(
    events.filter((x) => dateOf(x) <= dateStr),
    trades.filter((x) => dateOf(x) <= dateStr),
    settings
  ).balance;
}

/** סדרה לגרף: יתרה מול הכסף שהוכנס */
export function buildBalanceSeries(events = [], trades = [], settings = {}) {
  const rows = [
    ...events.map((e) => ({ date: dateOf(e), cash: amountOf(e), net: 0, kind: e.type })),
    ...trades.filter(isClosed).map((t) => ({ date: dateOf(t), cash: 0, net: netOf(t, settings), kind: "trade" })),
  ].filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));

  let cash = 0, net = 0;
  return rows.map((r) => {
    cash += r.cash; net += r.net;
    return { date: r.date, kind: r.kind, deposited: +cash.toFixed(2),
             balance: +(cash + net).toFixed(2), tradingPnl: +net.toFixed(2) };
  });
}

export function returnOnCapital(events = [], trades = [], settings = {}) {
  const { netDeposited, tradingPnl } = computeBalance(events, trades, settings);
  return netDeposited > 0 ? (tradingPnl / netDeposited) * 100 : 0;
}

/* ------------------------------------------------------------------
   ניתוח עלויות — מה ההרגלים שלך עולים לך
   ------------------------------------------------------------------ */
export function costReport(trades = [], settings = {}) {
  const closed = trades.filter(isClosed);
  const held = closed.filter((t) => (num(t.swap) ?? 0) !== 0 || t.heldOvernight);
  const heldSwap = held.reduce((s, t) => s + (num(t.swap) ?? 0), 0);
  const heldLosers = held.filter((t) => netOf(t, settings) < 0).length;
  const gross = closed.reduce((s, t) => s + grossOf(t), 0);
  const costs = closed.reduce((s, t) => s + costsOf(t, settings).total, 0);
  return {
    trades: closed.length,
    gross, costs, net: gross + costs,
    costShare: gross > 0 ? (Math.abs(costs) / gross) * 100 : null,  // כמה מהברוקר הברוטו נאכל
    overnight: { count: held.length, swap: heldSwap, losers: heldLosers },
  };
}

/** פער בין היתרה המחושבת לזו שבברוקר — להתאמה חודשית */
export const reconcile = (actualBalance, events, trades, settings) =>
  +(actualBalance - computeBalance(events, trades, settings).balance).toFixed(2);
