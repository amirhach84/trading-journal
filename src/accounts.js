/* ------------------------------------------------------------------
   accounts.js — הפרדה בין חשבונות מסחר

   כל עסקה נושאת accountId. המסכים מקבלים נתונים מסוננים לחשבון
   הפעיל, כך שהמספרים הכספיים לעולם לא מתערבבים בין חשבונות.
   ההיסטוריה ההתנהגותית נשמרת ונשארת זמינה לניתוח.
   ------------------------------------------------------------------ */

export const LEGACY_ID = 'personal';

/** חשבון ברירת המחדל — כל מה שנצבר עד היום */
export const LEGACY_ACCOUNT = {
  id: LEGACY_ID,
  name: 'חשבון אישי',
  kind: 'live',
  currency: 'USD',
  startBalance: 142,
  startDate: '2026-04-07',
  riskPct: 1,
};

/** ברירות מחדל לחשבון Propfirm — לאמת מול תנאי החברה */
export const PROP_DEFAULTS = {
  kind: 'prop',
  currency: 'USD',
  riskPct: 0.5,
  dailyLossPct: 5,
  maxDrawdownPct: 10,
  profitTargetPct: 8,
  drawdownType: 'static',   // static = מהיתרה ההתחלתית · trailing = מהשיא
};

const num = (v) => {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(x) ? x : null;
};

/* ------------------------------------------------------------------
   רשימת החשבונות והחשבון הפעיל
   ------------------------------------------------------------------ */

export function accountsOf(data = {}) {
  const list = Array.isArray(data.accounts) ? data.accounts : [];
  return list.length ? list : [LEGACY_ACCOUNT];
}

export function activeIdOf(data = {}) {
  const list = accountsOf(data);
  const id = data.activeAccount;
  return list.some((a) => a.id === id) ? id : list[0].id;
}

export function activeAccountOf(data = {}) {
  const id = activeIdOf(data);
  return accountsOf(data).find((a) => a.id === id) || LEGACY_ACCOUNT;
}

/** עסקה בלי accountId שייכת לחשבון הוותיק */
export const accountOfTrade = (t) => t.accountId || LEGACY_ID;

/* ------------------------------------------------------------------
   סינון הנתונים לחשבון הפעיל
   ------------------------------------------------------------------ */

/**
 * מחזיר עותק של data שבו כל הרשימות מסוננות לחשבון שנבחר.
 * המסכים מקבלים את זה במקום data ולא צריכים לדעת על חשבונות.
 */
export function scopeData(data = {}, id = null) {
  const acc = id || activeIdOf(data);
  const mine = (t) => accountOfTrade(t) === acc;
  return {
    ...data,
    trades: (data.trades || []).filter(mine),
    openTrades: (data.openTrades || []).filter(mine),
    accountEvents: (data.accountEvents || []).filter(
      (e) => (e.accountId || LEGACY_ID) === acc
    ),
    _scopedTo: acc,
  };
}

/**
 * ממזג בחזרה שינוי שנעשה על נתונים מסוננים.
 * עסקאות של חשבונות אחרים נשמרות כפי שהן, וכל עסקה חדשה
 * מקבלת את מזהה החשבון הפעיל.
 */
export function unscopeData(full = {}, scoped = {}, id = null) {
  const acc = id || scoped._scopedTo || activeIdOf(full);
  const others = (full.trades || []).filter((t) => accountOfTrade(t) !== acc);
  const othersOpen = (full.openTrades || []).filter((t) => accountOfTrade(t) !== acc);
  const othersEvents = (full.accountEvents || []).filter(
    (e) => (e.accountId || LEGACY_ID) !== acc
  );

  const stamp = (t) => (accountOfTrade(t) === acc ? t : { ...t, accountId: acc });

  const out = { ...full, ...scoped };
  delete out._scopedTo;
  out.trades = [...others, ...(scoped.trades || []).map(stamp)];
  out.openTrades = [...othersOpen, ...(scoped.openTrades || []).map(stamp)];
  out.accountEvents = [
    ...othersEvents,
    ...(scoped.accountEvents || []).map((e) =>
      (e.accountId || LEGACY_ID) === acc ? e : { ...e, accountId: acc }
    ),
  ];
  // שדות גלובליים שאינם שייכים לחשבון
  out.accounts = full.accounts || scoped.accounts;
  out.activeAccount = scoped.activeAccount || full.activeAccount;
  return out;
}

/* ------------------------------------------------------------------
   חוקי Propfirm
   ------------------------------------------------------------------ */

const dayOf = (t) => t.closeDate || t.date;

/**
 * מצב החשבון מול חוקי החברה.
 * netOf מוזרק מבחוץ כדי לא ליצור תלות מעגלית עם accountBalance.
 */
export function propStatus(account, trades = [], netOf) {
  const start = num(account.startBalance) || 0;
  if (!start) return null;

  const mine = trades.filter((t) => dayOf(t));
  const sorted = [...mine].sort((a, b) => dayOf(a).localeCompare(dayOf(b)));

  // יתרה, שיא ודראודאון
  let balance = start, peak = start, maxDD = 0;
  const byDay = new Map();
  for (const t of sorted) {
    const p = netOf(t);
    balance += p;
    peak = Math.max(peak, balance);
    maxDD = Math.max(maxDD, peak - balance);
    const k = dayOf(t);
    byDay.set(k, (byDay.get(k) || 0) + p);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayPnl = byDay.get(today) || 0;

  const dailyLimit = num(account.dailyLossPct)
    ? start * (num(account.dailyLossPct) / 100) : null;
  const ddLimit = num(account.maxDrawdownPct)
    ? start * (num(account.maxDrawdownPct) / 100) : null;
  const target = num(account.profitTargetPct)
    ? start * (num(account.profitTargetPct) / 100) : null;

  // דראודאון נמדד מהיתרה ההתחלתית או מהשיא
  const ddNow = account.drawdownType === 'trailing'
    ? peak - balance
    : Math.max(0, start - balance);

  const breaches = [];
  if (dailyLimit && todayPnl <= -dailyLimit)
    breaches.push(`ההפסד היום עבר את המותר (${fmtMoney(dailyLimit)})`);
  if (ddLimit && ddNow >= ddLimit)
    breaches.push(`הדראודאון עבר את המותר (${fmtMoney(ddLimit)})`);

  const warnings = [];
  if (dailyLimit && !breaches.length && todayPnl <= -dailyLimit * 0.6)
    warnings.push(`ניצלת ${Math.round((-todayPnl / dailyLimit) * 100)}% מההפסד היומי המותר`);
  if (ddLimit && !breaches.length && ddNow >= ddLimit * 0.6)
    warnings.push(`ניצלת ${Math.round((ddNow / ddLimit) * 100)}% מהדראודאון המותר`);

  return {
    start, balance, peak,
    pnl: balance - start,
    maxDD, ddNow, ddLimit,
    todayPnl, dailyLimit,
    target, targetHit: target ? balance - start >= target : false,
    targetPct: target ? ((balance - start) / target) * 100 : null,
    dailyUsedPct: dailyLimit ? Math.min(100, (-todayPnl / dailyLimit) * 100) : 0,
    ddUsedPct: ddLimit ? Math.min(100, (ddNow / ddLimit) * 100) : 0,
    breaches, warnings,
    blocked: breaches.length > 0,
  };
}

const fmtMoney = (v) =>
  `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** גודל הסיכון בדולרים לעסקה אחת */
export function riskPerTrade(account, balance) {
  const pct = num(account.riskPct);
  const base = num(balance) ?? num(account.startBalance) ?? 0;
  return pct ? base * (pct / 100) : 0;
}

/** יוצר חשבון חדש */
export function newAccount(name, kind = 'prop', startBalance = 100000) {
  const base = kind === 'prop' ? PROP_DEFAULTS : { kind: 'live', currency: 'USD', riskPct: 1 };
  return {
    ...base,
    id: `${kind}-${Date.now().toString(36)}`,
    name: name || (kind === 'prop' ? 'Propfirm' : 'חשבון'),
    startBalance,
    startDate: new Date().toISOString().slice(0, 10),
  };
}
