import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Btn } from './UI';
import { parseMt5Report, planMerge, applyMerge, DEFAULT_FROM } from '../mt5Import';

/* ------------------------------------------------------------------
   Mt5Import — ייבוא דוח MetaTrader 5
   <Mt5Import data={data} save={save} showToast={showToast} />
   ------------------------------------------------------------------ */

const FIELD_HE = {
  entry: 'כניסה', sl: 'סטופ', tp: 'מטרה', exitPrice: 'יציאה',
  lots: 'לוט', pips: 'פיפס', slPips: 'מרחק סטופ', tpPips: 'מרחק מטרה',
  grossUsd: 'רווח $', commission: 'עמלה', swap: 'swap',
  date: 'תאריך כניסה', time: 'שעת כניסה',
  closeDate: 'תאריך סגירה', closeTime: 'שעת סגירה',
  direction: 'כיוון', pair: 'צמד', result: 'תוצאה',
  heldOvernight: 'לילה', mt5Id: 'מזהה MT5', status: 'סטטוס',
};

const show = (v) =>
  v === null || v === undefined || v === '' ? '—'
  : typeof v === 'boolean' ? (v ? 'כן' : 'לא') : String(v);

/**
 * MT5 מייצא את הדוח ב-UTF-16LE. קריאה כ-UTF-8 תחזיר ג'יבריש,
 * ולכן מזהים את הקידוד מה-BOM או מדפוס בתי ה-null.
 */
function decodeBuffer(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3));
  // בלי BOM: ב-UTF-16LE כל בית שני הוא 0
  const probe = bytes.subarray(0, Math.min(400, bytes.length));
  let zerosOdd = 0;
  for (let i = 1; i < probe.length; i += 2) if (probe[i] === 0) zerosOdd++;
  if (zerosOdd > probe.length / 4) return new TextDecoder('utf-16le').decode(bytes);
  return new TextDecoder('utf-8').decode(bytes);
}

export default function Mt5Import({ data, save, showToast }) {
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [addNew, setAddNew] = useState(true);
  const [plan, setPlan] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);

  const readFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setBusy(true);
    const r = new FileReader();
    r.onload = () => {
      try {
        const rows = parseMt5Report(decodeBuffer(r.result));
        if (!rows.length) {
          showToast('לא זוהו עסקאות בקובץ', 'err');
          setParsed(null); setPlan(null);
        } else {
          setParsed(rows);
          setPlan(planMerge(data.trades || [], rows, { from, addNew }));
        }
      } catch (err) {
        showToast('שגיאה בקריאת הקובץ: ' + err.message, 'err');
      } finally {
        setBusy(false);
      }
    };
    r.onerror = () => { showToast('לא ניתן לקרוא את הקובץ', 'err'); setBusy(false); };
    r.readAsArrayBuffer(f);
    e.target.value = '';
  };

  const recompute = (nextFrom, nextAddNew) => {
    if (parsed) setPlan(planMerge(data.trades || [], parsed, { from: nextFrom, addNew: nextAddNew }));
  };

  const confirm = () => {
    if (!plan) return;
    const n = plan.additions.length, u = plan.updates.length;
    if (!n && !u) { showToast('אין מה לעדכן'); return; }
    if (!window.confirm(
      `לעדכן ${u} עסקאות ולהוסיף ${n} חדשות?\n` +
      `התיעוד המנטלי, הציונים והתגיות לא ייגעו.`
    )) return;
    save({ ...data, trades: applyMerge(data.trades || [], plan) });
    showToast(`✓ ${u} עודכנו, ${n} נוספו`);
    setPlan(null); setParsed(null);
  };

  const lbl = { color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 };
  const inp = {
    width: '100%', boxSizing: 'border-box', background: C.card2,
    border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 12px',
    color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none',
  };

  const Box = ({ n, label, color }) => (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
      <div style={{ color, fontSize: 20, fontWeight: 700 }}>{n}</div>
      <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ direction: 'rtl' }}>
      <Card>
        <SectionTitle>ייבוא מ-MetaTrader 5</SectionTitle>
        <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.85, marginBottom: 16 }}>
          ב-MT5 בדסקטופ: לשונית <b style={{ color: C.text }}>History</b> → לחיצה ימנית →
          <b style={{ color: C.text }}> All History</b> → לחיצה ימנית →
          <b style={{ color: C.text }}> Report → HTML</b>.
          <br />הזיהוי הוא לפי מספר הפוזיציה של MT5, כך שאפשר לייבא את אותו דוח שוב
          בלי ליצור כפילויות.
          <br /><b style={{ color: C.green }}>התיעוד המנטלי, הציונים ותגיות ההפסד לעולם לא נדרסים.</b>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={lbl}>מייבא מתאריך</div>
            <input type="date" value={from} style={inp}
              onChange={(e) => { setFrom(e.target.value); recompute(e.target.value, addNew); }} />
          </div>
          <div>
            <div style={lbl}>עסקאות שאינן ביומן</div>
            <div style={{ display: 'flex', gap: 3, background: C.card2, padding: 3,
              borderRadius: 9, border: `1px solid ${C.border}` }}>
              {[[true, 'הוסף'], [false, 'דלג']].map(([v, t]) => (
                <button key={String(v)} onClick={() => { setAddNew(v); recompute(from, v); }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                    cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                    background: addNew === v ? C.accent : 'transparent',
                    color: addNew === v ? '#0a0a0f' : C.muted }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <label style={{ display: 'block', textAlign: 'center', padding: '13px 0',
          borderRadius: 10, border: `1px dashed ${C.accent}66`, background: C.accent + '10',
          color: C.accent, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {busy ? 'קורא...' : '📄 בחר קובץ דוח'}
          <input type="file" accept=".html,.htm,.csv,.txt" onChange={readFile} style={{ display: 'none' }} />
        </label>
      </Card>

      {plan && (
        <>
          <Card>
            <SectionTitle>תצוגה מקדימה — עוד לא נשמר כלום</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
              <Box n={plan.additions.length} label="חדשות" color={C.green} />
              <Box n={plan.updates.length} label="יעודכנו" color={C.warn} />
              <Box n={plan.unchanged.length} label="ללא שינוי" color={C.muted} />
              <Box n={plan.skipped.length} label="דולגו" color={C.muted2 || C.muted} />
            </div>
            <div style={{ color: C.muted, fontSize: 11.5, lineHeight: 1.8 }}>
              בקובץ זוהו {plan.total} עסקאות. דולגו {plan.skipped.length} —
              לפני {plan.from}{!plan.addNew ? ' או שאינן ביומן' : ''}.
            </div>
            <Btn onClick={confirm} color={C.green}>
              אשר — {plan.updates.length} עדכונים, {plan.additions.length} חדשות
            </Btn>
          </Card>

          {plan.updates.length > 0 && (
            <Card>
              <SectionTitle>מה ישתנה בעסקאות קיימות</SectionTitle>
              {plan.updates.slice(0, 40).map((u, i) => (
                <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
                  <div onClick={() => setOpen(open === i ? null : i)}
                    style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <span style={{ color: C.text, fontSize: 13.5, fontWeight: 600 }}>
                        {u.incoming.date}
                      </span>
                      <span style={{ color: C.muted, fontSize: 12, marginRight: 8 }}>
                        {u.incoming.pair}
                      </span>
                      <span style={{ color: u.incoming.pips > 0 ? C.green : C.red, fontSize: 12.5 }}>
                        {u.incoming.pips > 0 ? '+' : ''}{u.incoming.pips}p
                      </span>
                    </div>
                    <span style={{ color: C.warn, fontSize: 11.5 }}>
                      {u.changes.length} שדות {open === i ? '▴' : '▾'}
                    </span>
                  </div>
                  {open === i && (
                    <div style={{ marginTop: 9, background: C.card2, borderRadius: 8, padding: '9px 11px' }}>
                      {u.changes.map((c, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between',
                          gap: 10, fontSize: 11.5, padding: '3px 0' }}>
                          <span style={{ color: C.muted }}>{FIELD_HE[c.field] || c.field}</span>
                          <span>
                            <span style={{ color: C.muted, textDecoration: 'line-through' }}>
                              {show(c.before)}
                            </span>
                            <span style={{ color: C.green, marginRight: 8 }}>{show(c.after)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {plan.updates.length > 40 && (
                <div style={{ color: C.muted, fontSize: 11.5, textAlign: 'center', paddingTop: 10 }}>
                  ועוד {plan.updates.length - 40} עסקאות
                </div>
              )}
            </Card>
          )}

          {plan.additions.length > 0 && (
            <Card>
              <SectionTitle>עסקאות שיתווספו</SectionTitle>
              {plan.additions.slice(0, 40).map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>
                    {t.date} {t.time} · <span style={{ color: C.text }}>{t.pair}</span>
                    {' '}{t.direction === 'long' ? '▲' : '▼'}
                  </span>
                  <span style={{ color: t.grossUsd >= 0 ? C.green : C.red, fontWeight: 600 }}>
                    {t.grossUsd >= 0 ? '+' : '−'}${Math.abs(t.grossUsd).toFixed(2)}
                  </span>
                </div>
              ))}
              {plan.additions.length > 40 && (
                <div style={{ color: C.muted, fontSize: 11.5, textAlign: 'center', paddingTop: 10 }}>
                  ועוד {plan.additions.length - 40} עסקאות
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
