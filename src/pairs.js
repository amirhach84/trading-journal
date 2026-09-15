/* ------------------------------------------------------------------
   pairs.js — הזוגות שאמיר סוחר, וחישוב שווי פיפ ללוט אחד בדולר
   ------------------------------------------------------------------ */

export const PAIRS = {
  GBPJPY: {
    key: "GBPJPY", label: "GBP/JPY",
    pip: 0.01, decimals: 3, step: 0.001, placeholder: "197.450",
    // 1 לוט = 100,000 ליש"ט. פיפ = 0.01 ין -> 1,000 ין ללוט.
    // הרווח נוצר בין, ולכן צריך להמיר לדולר לפי USDJPY.
    needsRate: true,
    pipValue: (usdjpy) => 1000 / (usdjpy || 155),
  },
  GBPUSD: {
    key: "GBPUSD", label: "GBP/USD",
    pip: 0.0001, decimals: 5, step: 0.0001, placeholder: "1.34500",
    // 1 לוט = 100,000 ליש"ט. פיפ = 0.0001 דולר -> $10 ללוט. אין המרה.
    needsRate: false,
    pipValue: () => 10,
  },
};

export const PAIR_LIST = Object.values(PAIRS);

export const getPair = (key) => PAIRS[key] || PAIRS.GBPJPY;

/** מרחק בין שני מחירים, בפיפס */
export const priceToPips = (a, b, pairKey) => Math.abs(a - b) / getPair(pairKey).pip;

/** שווי פיפ ללוט אחד, או null אם הזוג לא נתמך */
export const pipValueOf = (pairKey, usdjpy) =>
  PAIRS[pairKey] ? PAIRS[pairKey].pipValue(usdjpy) : null;

/** שווי פיפ בדולר עבור גודל פוזיציה נתון */
export const pipValueFor = (pairKey, lots, usdjpy) => getPair(pairKey).pipValue(usdjpy) * lots;
