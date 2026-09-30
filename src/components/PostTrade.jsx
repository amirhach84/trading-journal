import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Textarea, ScoreSlider, Btn } from './UI';
import LossReasonPicker from './LossReasonPicker';
import { rContext } from '../rMultiple';
import { netOf } from '../accountBalance';

/* ------------------------------------------------------------------
   PostTrade — תיעוד אחרי עסקה

   כל הנתונים המספריים מגיעים מ-MetaTrader דרך מסך הייבוא ואינם
   ניתנים לעריכה כאן. מה שנשאר ידני: מסקנות, צילומים, ציון משמעת
   ותגית סיבת הפסד.
   ------------------------------------------------------------------ */

const usd = (v) => `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`;
const isLossTrade = (t) => t.result === 'loss' || (parseFloat(t.pips) || 0) < 0;

const documented = (t) =>
  !!(t.conclusions || '').trim() ||
  (t.screenshots || []).some(Boolean) ||
  typeof t.disciplineScore === 'number';

function Screenshot({ url, index, onChange }) {
  const [err, setErr] = useState(false);
  const ok = url && url.startsWith('http');
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>
        📸 {['Entry', 'Exit', 'Multi-TF'][index]}
      </div>
      <input type="url" value={url} onChange={e => { setErr(false); onChange(e.target.value); }}
        placeholder="הדבק לינק מטלגרם..."
        style={{ width: '100%', background: C.card2,
          border: `1px solid ${ok ? C.accent + '66' : C.border}`, borderRadius: 9,
          padding: '10px 13px', color: C.text, fontSize: 13, fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box', marginBottom: ok ? 8 : 0 }} />
      {ok && (
        <div style={{ borderRadius: 9, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {!err ? (
            <img src={url} alt="" onError={() => setErr(true)}
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                background: C.card2, color: C.accent, textDecoration: 'none', fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>📷</span>
              <span>פתח בטלגרם</span>
              <span style={{ marginRight: 'auto', color: C.muted }}>↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostTrade({ data, save, showToast }) {
  const trades = data.trades || [];
  const R = rContext();
  const cfg = data.settings || {};

  const [selId, setSelId] = useState(null);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [form, setForm] = useState(null);

  const sorted = [...trades].sort((a, b) =>
    String(b.closeDate || b.date).localeCompare(String(a.closeDate || a.date)));
  const list = (onlyOpen ? sorted.filter(t => !documented(t)) : sorted).slice(0, 30);
  const sel = trades.find(t => t.id === selId) || null;

  const pick = (t) => {
    setSelId(t.id);
    setForm({
      conclusions: t.conclusions || '',
      disciplineScore: typeof t.disciplineScore === 'number' ? t.disciplineScore : 7,
      lossReason: t.lossReason || null,
      screenshots: [...(t.screenshots || ['', '', ''])],
    });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!sel || !form) return;
    if (isLossTrade(sel) && !form.lossReason) {
      showToast('בחר סיבת הפסד לפני השמירה', 'err'); return;
    }
    const next = trades.map(t => t.id === sel.id ? {
      ...t,
      conclusions: form.conclusions,
      disciplineScore: form.disciplineScore,
      lossReason: form.lossReason,
      screenshots: form.screenshots,
      documentedAt: new Date().toISOString(),
    } : t);
    save({ ...data, trades: next });
    showToast('✓ התיעוד נשמר');
    setSelId(null); setForm(null);
  };

  const undocumented = sorted.filter(t => !documented(t)).length;

  /* ---------- בחירת עסקה ---------- */
  if (!sel) {
    return (
      <div>
        <Card>
          <SectionTitle>בחר עסקה לתיעוד</SectionTitle>
          <div style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.85, marginBottom: 14 }}>
            כל הנתונים המספריים מגיעים מ-MetaTrader.
            כאן מוסיפים רק מסקנות וצילומים.
            {undocumented > 0 && (
              <><br /><b style={{ color: C.warn }}>{undocumented} עסקאות ממתינות לתיעוד.</b></>
            )}
          </div>

          <div style={{ display: 'flex', gap: 3, background: C.card2, padding: 3,
            borderRadius: 9, border: `1px solid ${C.border}`, marginBottom: 14 }}>
            {[[true, 'ללא תיעוד'], [false, 'הכל']].map(([v, t]) => (
              <button key={String(v)} onClick={() => setOnlyOpen(v)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                  cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                  background: onlyOpen === v ? C.accent : 'transparent',
                  color: onlyOpen === v ? '#0a0a0f' : C.muted }}>{t}</button>
            ))}
          </div>

          {list.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13.5, textAlign: 'center', padding: '26px 0' }}>
              {onlyOpen ? 'כל העסקאות מתועדות. יפה.' : 'אין עסקאות. ייבא מ-MetaTrader בטאב הגדרות.'}
            </div>
          ) : list.map(t => {
            const money = netOf(t, cfg);
            const r = R.of(t);
            const done = documented(t);
            return (
              <div key={t.id} onClick={() => pick(t)} style={{
                padding: '12px 13px', marginBottom: 8, borderRadius: 10,
                border: `1px solid ${done ? C.border : C.accent + '44'}`,
                background: C.card2, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{t.pair}</span>
                    <span style={{ color: t.direction === 'long' ? C.green : C.red,
                      fontSize: 12, marginRight: 7 }}>
                      {t.direction === 'long' ? '▲' : '▼'}
                    </span>
                    <span style={{ color: C.muted, fontSize: 12, marginRight: 7 }}>
                      {t.date}{t.closeDate && t.closeDate !== t.date ? ` → ${t.closeDate}` : ''}
                    </span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: money >= 0 ? C.green : C.red, fontWeight: 700, fontSize: 15 }}>
                      {usd(money)}
                    </div>
                    <div style={{ color: C.muted, fontSize: 10 }}>
                      {t.pips > 0 ? '+' : ''}{t.pips}p{r.hasR ? ` · ${R.fmt(t)}` : ''}
                    </div>
                  </div>
                </div>
                {done && (
                  <div style={{ color: C.green, fontSize: 10.5, marginTop: 6 }}>✓ מתועד</div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    );
  }

  /* ---------- תיעוד העסקה שנבחרה ---------- */
  const money = netOf(sel, cfg);
  const r = R.of(sel);
  const loss = isLossTrade(sel);

  const Row = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12.5 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color: color || C.text, fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <div>
      {/* נתוני MT5 — לקריאה בלבד */}
      <Card style={{ borderColor: C.accent + '44' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ color: C.text, fontSize: 17, fontWeight: 700 }}>{sel.pair}</span>
            <span style={{ color: sel.direction === 'long' ? C.green : C.red,
              fontSize: 13, marginRight: 8 }}>
              {sel.direction === 'long' ? '▲ Long' : '▼ Short'}
            </span>
          </div>
          <button onClick={() => { setSelId(null); setForm(null); }}
            style={{ background: 'none', border: `1px solid ${C.border}`, color: C.muted,
              borderRadius: 8, padding: '6px 13px', fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit' }}>
            החלף עסקה
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          background: C.card2, borderRadius: 10, padding: '12px 10px', marginBottom: 12, textAlign: 'center' }}>
          <div>
            <div style={{ color: money >= 0 ? C.green : C.red, fontSize: 19, fontWeight: 800 }}>
              {usd(money)}
            </div>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>נטו</div>
          </div>
          <div>
            <div style={{ color: sel.pips >= 0 ? C.green : C.red, fontSize: 19, fontWeight: 800 }}>
              {sel.pips > 0 ? '+' : ''}{sel.pips}
            </div>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>פיפס</div>
          </div>
          <div>
            <div style={{ color: r.hasR ? (r.value >= 0 ? C.green : C.red) : C.muted,
              fontSize: 19, fontWeight: 800 }}>
              {r.hasR ? R.fmt(sel) : '—'}
            </div>
            <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>
              {r.planned ? `תכננת ${r.planned.toFixed(2)}R` : 'R'}
            </div>
          </div>
        </div>

        <Row label="כניסה" value={`${sel.date} ${sel.time || ''} · ${sel.entry}`} />
        <Row label="יציאה" value={`${sel.closeDate || sel.date} ${sel.closeTime || ''} · ${sel.exitPrice ?? '—'}`} />
        <Row label="סטופ / מטרה" value={`${sel.sl || '—'} / ${sel.tp || '—'}`} />
        <Row label="לוט" value={sel.lots ?? '—'} />
        <Row label="עמלה / swap"
          value={`${usd(sel.commission ?? 0)} / ${usd(sel.swap ?? 0)}`} color={C.muted} />
      </Card>

      {/* משמעת */}
      <Card>
        <SectionTitle>ציון משמעת</SectionTitle>
        <ScoreSlider label="עד כמה ביצעת לפי התוכנית?" value={form.disciplineScore}
          onChange={v => set('disciplineScore', v)}
          rightLabel="1 — אפס שליטה" leftLabel="10 — שליטה מלאה" />
      </Card>

      {/* סיבת הפסד */}
      {loss && (
        <Card>
          <SectionTitle>סיבת ההפסד</SectionTitle>
          <LossReasonPicker value={form.lossReason} onChange={v => set('lossReason', v)} />
        </Card>
      )}

      {/* מסקנות */}
      <Card>
        <SectionTitle>מסקנות מהעסקה</SectionTitle>
        <Textarea value={form.conclusions} onChange={v => set('conclusions', v)}
          placeholder="מה קרה, מה עבד, מה תעשה אחרת בפעם הבאה..." rows={7} />
      </Card>

      {/* צילומים */}
      <Card>
        <SectionTitle>📸 Screenshots מטלגרם</SectionTitle>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 14, lineHeight: 1.7 }}>
          שלח Screenshot לטלגרם ← לחיצה ארוכה ← Copy Link ← הדבק כאן
        </div>
        {form.screenshots.map((url, i) => (
          <Screenshot key={i} url={url} index={i} onChange={v => {
            const s = [...form.screenshots]; s[i] = v; set('screenshots', s);
          }} />
        ))}
      </Card>

      <Btn onClick={handleSave} color={C.accent}>💾 שמור תיעוד</Btn>
    </div>
  );
}
