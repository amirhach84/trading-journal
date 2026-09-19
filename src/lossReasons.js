/* ------------------------------------------------------------------
   lossReasons.js — תיוג מובנה של הפסדים
   ההפרדה המרכזית: הפסד תקין (המערכת עבדה, השוק לא הלך) מול טעות.
   ------------------------------------------------------------------ */

export const LOSS_REASONS = [
  { id: 'valid',     label: 'הפסד תקין',            short: 'תקין',    error: false,
    hint: 'הסטאפ היה מלא לפי החוקים. השוק פשוט לא הלך. זה לא כישלון.' },
  { id: 'trend',     label: 'נגד המגמה בטיימפריים גבוה', short: 'נגד מגמה', error: true,
    hint: 'ה-Daily או H4 לא תמכו בכיוון.' },
  { id: 'early',     label: 'לא חיכיתי לכל האישורים', short: 'מוקדם',   error: true,
    hint: 'נכנסתי לפני שהנר נסגר או לפני שכל התנאים מולאו.' },
  { id: 'extra',     label: 'עסקה שנייה או שלישית ביום', short: 'עסקה עודפת', error: true,
    hint: 'לא הייתי צריך להיות בשוק בכלל באותו רגע.' },
  { id: 'revenge',   label: 'ניסיון להחזיר הפסד',    short: 'החזרה',   error: true,
    hint: 'נכנסתי כי הפסדתי, לא כי היה סטאפ.' },
  { id: 'overnight', label: 'החזקה לילית שלא נסגרה בזמן', short: 'לילה', error: true,
    hint: 'היה רווח, לא סגרתי, והלילה הפך אותו.' },
  { id: 'moved',     label: 'הזזתי SL או שיניתי תוכנית', short: 'שיניתי', error: true,
    hint: 'התוכנית המקורית הייתה בסדר. אני לא הייתי.' },
  { id: 'news',      label: 'חדשות או אירוע חיצוני',  short: 'חדשות',   error: false,
    hint: 'NFP, FOMC או הפתעה שלא ניתן היה לתמחר.' },
];

export const reasonById = (id) => LOSS_REASONS.find((r) => r.id === id) || null;

const num = (v) => {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(x) ? x : null;
};

export const isLoss = (t) => t.result === 'loss' || (num(t.pips) || 0) < 0;

/**
 * פילוח ההפסדים לפי סיבה.
 * R — הקשר מ-rMultiple (rContext). אם לא הועבר, מחושב רק לפי פיפס.
 */
export function summarizeLosses(trades = [], R) {
  const val = R ? (t) => R.value(t) : (t) => (num(t.pips) || 0);
  const losses = trades.filter(isLoss);

  const rows = LOSS_REASONS.map((r) => {
    const list = losses.filter((t) => t.lossReason === r.id);
    return {
      ...r,
      count: list.length,
      totalR: list.reduce((s, t) => s + val(t), 0),
      trades: list,
    };
  }).filter((r) => r.count > 0);

  const untagged = losses.filter((t) => !t.lossReason);
  const errors = rows.filter((r) => r.error);
  const clean = rows.filter((r) => !r.error);

  const errorR = errors.reduce((s, r) => s + r.totalR, 0);
  const cleanR = clean.reduce((s, r) => s + r.totalR, 0);

  return {
    losses: losses.length,
    tagged: losses.length - untagged.length,
    untagged: untagged.length,
    rows: rows.sort((a, b) => a.totalR - b.totalR),   // הכי כואב ראשון
    errorCount: errors.reduce((s, r) => s + r.count, 0),
    cleanCount: clean.reduce((s, r) => s + r.count, 0),
    errorR,
    cleanR,
    /** כמה היה נחסך אילו הטעויות לא היו קורות */
    avoidableR: errorR,
  };
}

/** פילוח לפי חודש — האם הטעויות יורדות עם הזמן */
export function lossTrend(trades = [], R) {
  const val = R ? (t) => R.value(t) : (t) => (num(t.pips) || 0);
  const map = new Map();
  for (const t of trades.filter(isLoss)) {
    const m = (t.date || '').slice(0, 7);
    if (!m) continue;
    if (!map.has(m)) map.set(m, { month: m, errorR: 0, cleanR: 0, errors: 0, clean: 0, untagged: 0 });
    const row = map.get(m);
    const r = reasonById(t.lossReason);
    if (!r) row.untagged++;
    else if (r.error) { row.errors++; row.errorR += val(t); }
    else { row.clean++; row.cleanR += val(t); }
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}
