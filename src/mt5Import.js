/* ------------------------------------------------------------------
   mt5Import.js — ייבוא דוח History מ-MetaTrader 5

   הדוח מכיל את העמודות:
     Time · Position · Symbol · Type · Volume · Price · S/L · T/P ·
     Time · Price · Commission · Swap · Profit

   מזהה העסקה הוא מספר הפוזיציה של MT5 (Position) — קבוע וייחודי,
   ולכן ייבוא חוזר של אותו דוח לא ייצור כפילויות.
   ------------------------------------------------------------------ */

import { pipSize } from './rMultiple';

/** מאיזה תאריך מייבאים כברירת מחדל — תחילת היומן */
export const DEFAULT_FROM = '2026-04-07';

/** השדות ש-MT5 הוא מקור האמת עבורם. כל השאר נשאר כפי שהוא ביומן. */
export const MT5_FIELDS = [
  'mt5Id', 'date', 'time', 'closeDate', 'closeTime', 'pair', 'direction',
  'lots', 'entry', 'sl', 'tp', 'exitPrice', 'commission', 'swap',
  'grossUsd', 'pips', 'slPips', 'tpPips', 'result', 'status', 'heldOvernight',
];

const num = (v) => {
  if (v === null || v === undefined) return null;
  const x = parseFloat(String(v).replace(/[\s,]/g, ''));
  return Number.isFinite(x) ? x : null;
};

const DT = /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/;
const isDT = (s) => DT.test(String(s || '').trim());
const splitDT = (s) => {
  const m = DT.exec(String(s).trim());
  return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` } : null;
};

/* ------------------------------------------------------------------
   שלב 1 — חילוץ שורות מהקובץ
   ------------------------------------------------------------------ */

/** שורת טבלה אחת -> עסקה, או null אם זו לא שורת פוזיציה */
function rowToTrade(cells) {
  if (cells.length < 11) return null;
  const openDT = splitDT(cells[0]);
  if (!openDT) return null;
  if (!/^\d+$/.test(String(cells[1]).trim())) return null;

  const type = String(cells[3]).trim().toLowerCase();
  if (type !== 'buy' && type !== 'sell') return null;

  // העמודה הבאה שהיא תאריך־שעה היא זמן הסגירה.
  // כל שאר העמודות נמדדות ממנה, כי בדוחות שונים יש תאי ריווח
  // במקומות שונים ומספר התאים אינו קבוע.
  let j = -1;
  for (let i = 4; i < cells.length; i++) if (isDT(cells[i])) { j = i; break; }
  if (j < 4 || j + 4 >= cells.length) return null;
  const closeDT = splitDT(cells[j]);

  const pair = String(cells[2]).trim().toUpperCase();
  const long = type === 'buy';
  const pip = pipSize(pair);

  //  j-4 נפח · j-3 מחיר כניסה · j-2 סטופ · j-1 מטרה
  //  j   זמן סגירה
  //  j+1 מחיר יציאה · j+2 עמלה · j+3 swap · j+4 רווח
  const lots = num(cells[j - 4]);
  const entry = num(cells[j - 3]);
  const sl = num(cells[j - 2]);
  const tp = num(cells[j - 1]);
  const exitPrice = num(cells[j + 1]);
  const commission = num(cells[j + 2]) ?? 0;
  const swap = num(cells[j + 3]) ?? 0;
  const profit = num(cells[j + 4]);

  if (entry === null || exitPrice === null || profit === null) return null;

  const raw = long ? exitPrice - entry : entry - exitPrice;
  const pips = +(raw / pip).toFixed(1);

  return {
    mt5Id: String(cells[1]).trim(),
    date: openDT.date,
    time: openDT.time,
    closeDate: closeDT.date,
    closeTime: closeDT.time,
    pair,
    direction: long ? 'long' : 'short',
    lots,
    entry,
    sl: sl ?? '',
    tp: tp ?? '',
    exitPrice,
    commission,
    swap,
    grossUsd: profit,
    pips,
    slPips: sl ? +(Math.abs(entry - sl) / pip).toFixed(1) : null,
    tpPips: tp ? +(Math.abs(tp - entry) / pip).toFixed(1) : null,
    result: pips > 0 ? 'win' : pips < 0 ? 'loss' : 'be',
    status: 'closed',
    heldOvernight: closeDT.date !== openDT.date,
  };
}

/** קריאת HTML — הדרך המדויקת, כי תאים ריקים נשמרים במקומם */
function parseHtml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const out = [];
  doc.querySelectorAll('tr').forEach((tr) => {
    const cells = [...tr.querySelectorAll('td,th')].map(
      (td) => (td.textContent || '').replace(/\u00a0/g, ' ').trim()
    );
    const t = rowToTrade(cells);
    if (t) out.push(t);
  });
  return out;
}

/** קריאת טקסט/CSV — גיבוי כשהקובץ אינו HTML */
function parseText(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.includes('\t') ? line.split('\t')
      : line.includes(',') && line.split(',').length > 10 ? line.split(',')
      : line.trim().split(/\s{2,}/);
    const t = rowToTrade(cells.map((c) => c.trim()));
    if (t) out.push(t);
  }
  return out;
}

/** נקודת הכניסה: תוכן הקובץ -> רשימת עסקאות */
export function parseMt5Report(text) {
  const looksHtml = /<\s*(table|tr|html)\b/i.test(text);
  let trades = looksHtml ? parseHtml(text) : [];
  if (!trades.length) trades = parseText(text);
  // כפילויות באותו דוח — האחרון מנצח
  const byId = new Map();
  trades.forEach((t) => byId.set(t.mt5Id, t));
  return [...byId.values()].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/* ------------------------------------------------------------------
   שלב 2 — מיזוג עם היומן
   ------------------------------------------------------------------ */

const priceKey = (t) => {
  const e = num(t.entry);
  return e === null ? null : `${t.date}|${e.toFixed(5)}`;
};

/**
 * מחזיר תוכנית מיזוג בלי לשנות כלום — לתצוגה מקדימה.
 * options: { from, addNew }
 */
export function planMerge(existing = [], incoming = [], options = {}) {
  const from = options.from || DEFAULT_FROM;
  const addNew = options.addNew !== false;

  const byId = new Map();
  const byPrice = new Map();
  existing.forEach((t) => {
    if (t.mt5Id) byId.set(String(t.mt5Id), t);
    const k = priceKey(t);
    if (k && !byPrice.has(k)) byPrice.set(k, t);
  });

  const updates = [], additions = [], unchanged = [], skipped = [];

  for (const inc of incoming) {
    if (inc.date < from) { skipped.push(inc); continue; }

    const match = byId.get(inc.mt5Id) || byPrice.get(priceKey(inc));
    if (!match) {
      if (addNew) additions.push(inc); else skipped.push(inc);
      continue;
    }

    const changes = [];
    for (const f of MT5_FIELDS) {
      const before = match[f];
      const after = inc[f];
      const same =
        (before === after) ||
        (num(before) !== null && num(after) !== null && Math.abs(num(before) - num(after)) < 1e-6) ||
        ((before === '' || before === null || before === undefined) &&
         (after === '' || after === null || after === undefined));
      if (!same) changes.push({ field: f, before, after });
    }
    if (changes.length) updates.push({ trade: match, incoming: inc, changes });
    else unchanged.push(match);
  }

  return {
    from, addNew,
    additions, updates, unchanged, skipped,
    total: incoming.length,
  };
}

/** מחיל תוכנית מיזוג ומחזיר מערך עסקאות חדש */
export function applyMerge(existing = [], plan) {
  const updById = new Map(plan.updates.map((u) => [u.trade.id ?? u.trade.mt5Id, u]));

  const merged = existing.map((t) => {
    const u = updById.get(t.id ?? t.mt5Id);
    if (!u) return t;
    const next = { ...t };
    // רק השדות של MT5 נדרסים. כל התיעוד האישי נשאר.
    MT5_FIELDS.forEach((f) => { next[f] = u.incoming[f]; });
    next.mt5Synced = new Date().toISOString();
    return next;
  });

  let seq = Date.now();
  plan.additions.forEach((inc) => {
    merged.push({
      ...inc,
      id: seq++,
      setupNum: '',
      whyEntered: '', feltBefore: '', feltDuring: '',
      mentalMistake: '', whatGood: '', whatFix: '',
      disciplineScore: null, patienceScore: null, emotionScore: null,
      closedByPlan: null, respected2R: null,
      triedHomeRun: false, changedFromEmotion: false,
      triedToRecover: false, violatedRule: false,
      lossReason: null,
      screenshots: ['', '', ''],
      fromMt5: true,
      savedAt: new Date().toISOString(),
      mt5Synced: new Date().toISOString(),
    });
  });

  return merged.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
