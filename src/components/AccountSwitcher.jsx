import { useState } from 'react';
import { C } from '../theme';
import {
  accountsOf, activeIdOf, activeAccountOf, newAccount,
  propStatus, riskPerTrade, accountOfTrade, PROP_DEFAULTS,
} from '../accounts';
import { netOf } from '../accountBalance';

/* ------------------------------------------------------------------
   AccountSwitcher — בורר חשבון + מצב חוקי Propfirm
   <AccountSwitcher data={data} save={save} showToast={showToast} />
   ------------------------------------------------------------------ */

const usd = (v, dec = 0) =>
  `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

export default function AccountSwitcher({ data, save, showToast, compact }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(null);

  const list = accountsOf(data);
  const activeId = activeIdOf(data);
  const acc = activeAccountOf(data);
  const cfg = data.settings || {};

  const mine = (data.trades || []).filter(t => accountOfTrade(t) === activeId);
  const prop = acc.kind === 'prop'
    ? propStatus(acc, mine, (t) => netOf(t, cfg))
    : null;

  const switchTo = (id) => {
    save({ ...data, accounts: list, activeAccount: id });
  };

  const startAdd = () => {
    setDraft({ ...newAccount('Propfirm $100K', 'prop', 100000) });
    setAdding(true);
  };

  const commit = () => {
    const d = draft;
    if (!d.name.trim()) { showToast('תן שם לחשבון', 'err'); return; }
    if (!(parseFloat(d.startBalance) > 0)) { showToast('הזן יתרה התחלתית', 'err'); return; }
    const clean = {
      ...d,
      startBalance: parseFloat(d.startBalance),
      riskPct: parseFloat(d.riskPct) || 0.5,
      dailyLossPct: parseFloat(d.dailyLossPct) || null,
      maxDrawdownPct: parseFloat(d.maxDrawdownPct) || null,
      profitTargetPct: parseFloat(d.profitTargetPct) || null,
    };
    save({ ...data, accounts: [...list, clean], activeAccount: clean.id });
    showToast(`✓ ${clean.name} נוצר והוא החשבון הפעיל`);
    setAdding(false); setDraft(null);
  };

  const lbl = { color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 };
  const inp = {
    width: '100%', boxSizing: 'border-box', background: C.card2,
    border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 12px',
    color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none',
  };

  /* ---------- מד ניצול ---------- */
  const Gauge = ({ label, used, detail, limit }) => {
    const col = used >= 100 ? C.red : used >= 60 ? C.warn : C.green;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
          <span style={{ color: C.muted }}>{label}</span>
          <span style={{ color: col, fontWeight: 700 }}>{detail}</span>
        </div>
        <div style={{ height: 7, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, used)}%`, height: '100%', background: col,
            borderRadius: 4, transition: 'width 0.25s' }} />
        </div>
        {limit && (
          <div style={{ color: C.muted, fontSize: 10, marginTop: 3, textAlign: 'left' }}>
            מותר עד {usd(limit)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ direction: 'rtl' }}>
      {/* ---------- בורר ---------- */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4,
        marginBottom: compact ? 0 : 14 }}>
        {list.map(a => {
          const on = a.id === activeId;
          return (
            <button key={a.id} onClick={() => switchTo(a.id)} style={{
              flexShrink: 0, padding: '9px 15px', borderRadius: 10,
              border: `1px solid ${on ? C.accent : C.border}`,
              background: on ? C.accent + '18' : 'transparent',
              color: on ? C.accent : C.muted,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              fontWeight: on ? 700 : 400, whiteSpace: 'nowrap',
            }}>
              {a.kind === 'prop' ? '🏛 ' : '👤 '}{a.name}
            </button>
          );
        })}
        <button onClick={startAdd} style={{
          flexShrink: 0, padding: '9px 14px', borderRadius: 10,
          border: `1px dashed ${C.border}`, background: 'transparent',
          color: C.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
        }}>+ חשבון</button>
      </div>

      {compact && !adding && <div />}

      {/* ---------- טופס חשבון חדש ---------- */}
      {adding && draft && (
        <div style={{ background: C.card, border: `1px solid ${C.accent}44`,
          borderRadius: 14, padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
            marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
            חשבון חדש
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={lbl}>שם</div>
            <input style={inp} value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: 3, background: C.card2, padding: 3,
            borderRadius: 9, border: `1px solid ${C.border}`, marginBottom: 12 }}>
            {[['prop', '🏛 Propfirm'], ['live', '👤 אישי']].map(([k, t]) => (
              <button key={k} onClick={() => setDraft(d => ({
                ...d, kind: k,
                ...(k === 'prop' ? PROP_DEFAULTS : { riskPct: 1, dailyLossPct: null, maxDrawdownPct: null, profitTargetPct: null }),
              }))} style={{
                flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                background: draft.kind === k ? C.accent : 'transparent',
                color: draft.kind === k ? '#0a0a0f' : C.muted,
              }}>{t}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={lbl}>יתרה התחלתית ($)</div>
              <input style={inp} type="number" value={draft.startBalance}
                onChange={e => setDraft(d => ({ ...d, startBalance: e.target.value }))} />
            </div>
            <div>
              <div style={lbl}>סיכון לעסקה (%)</div>
              <input style={inp} type="number" step="0.1" value={draft.riskPct}
                onChange={e => setDraft(d => ({ ...d, riskPct: e.target.value }))} />
            </div>
          </div>

          {draft.kind === 'prop' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={lbl}>הפסד יומי (%)</div>
                  <input style={inp} type="number" step="0.5" value={draft.dailyLossPct ?? ''}
                    onChange={e => setDraft(d => ({ ...d, dailyLossPct: e.target.value }))} />
                </div>
                <div>
                  <div style={lbl}>דראודאון (%)</div>
                  <input style={inp} type="number" step="0.5" value={draft.maxDrawdownPct ?? ''}
                    onChange={e => setDraft(d => ({ ...d, maxDrawdownPct: e.target.value }))} />
                </div>
                <div>
                  <div style={lbl}>יעד רווח (%)</div>
                  <input style={inp} type="number" step="0.5" value={draft.profitTargetPct ?? ''}
                    onChange={e => setDraft(d => ({ ...d, profitTargetPct: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={lbl}>איך נמדד הדראודאון</div>
                <div style={{ display: 'flex', gap: 3, background: C.card2, padding: 3,
                  borderRadius: 9, border: `1px solid ${C.border}` }}>
                  {[['static', 'מהיתרה ההתחלתית'], ['trailing', 'מהשיא']].map(([k, t]) => (
                    <button key={k} onClick={() => setDraft(d => ({ ...d, drawdownType: k }))} style={{
                      flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                      background: draft.drawdownType === k ? C.accent : 'transparent',
                      color: draft.drawdownType === k ? '#0a0a0f' : C.muted,
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <div style={{ background: C.card2, borderRadius: 9, padding: '10px 12px',
                color: C.muted, fontSize: 11.5, lineHeight: 1.8, marginBottom: 12 }}>
                סיכון של <b style={{ color: C.accent }}>{draft.riskPct}%</b> על{' '}
                {usd(parseFloat(draft.startBalance) || 0)} הוא{' '}
                <b style={{ color: C.text }}>
                  {usd((parseFloat(draft.startBalance) || 0) * (parseFloat(draft.riskPct) || 0) / 100)}
                </b> לעסקה.
                {draft.dailyLossPct && (
                  <> ההפסד היומי המותר הוא{' '}
                  <b style={{ color: C.red }}>
                    {usd((parseFloat(draft.startBalance) || 0) * (parseFloat(draft.dailyLossPct) || 0) / 100)}
                  </b> — כלומר{' '}
                  <b style={{ color: C.text }}>
                    {Math.floor((parseFloat(draft.dailyLossPct) || 0) / (parseFloat(draft.riskPct) || 1))}
                  </b> עסקאות מפסידות ביום אחד.</>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={commit} style={{ flex: 1, background: C.green + '18',
              border: `1px solid ${C.green}`, color: C.green, borderRadius: 9,
              padding: '11px 0', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              צור חשבון
            </button>
            <button onClick={() => { setAdding(false); setDraft(null); }}
              style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`,
                color: C.muted, borderRadius: 9, padding: '11px 0', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14 }}>
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* ---------- מצב חוקי Propfirm ---------- */}
      {prop && !compact && (
        <div style={{
          background: prop.blocked ? '#1a0808' : C.card,
          border: `1px solid ${prop.blocked ? C.red : prop.warnings.length ? C.warn + '55' : C.border}`,
          borderRadius: 14, padding: '18px 16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
            <span style={{ color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
              חוקי החשבון
            </span>
            <span style={{ color: prop.pnl >= 0 ? C.green : C.red, fontSize: 18, fontWeight: 800 }}>
              {usd(prop.balance)}
            </span>
          </div>

          {prop.blocked && (
            <div style={{ background: C.red + '18', border: `1px solid ${C.red}55`, borderRadius: 10,
              padding: '12px 14px', marginBottom: 14, lineHeight: 1.8 }}>
              <div style={{ color: C.red, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                🚫 חוק הופר — אל תפתח עסקה
              </div>
              {prop.breaches.map((b, i) => (
                <div key={i} style={{ color: C.text, fontSize: 13 }}>• {b}</div>
              ))}
            </div>
          )}

          {!prop.blocked && prop.warnings.length > 0 && (
            <div style={{ background: C.warn + '12', border: `1px solid ${C.warn}44`, borderRadius: 10,
              padding: '11px 13px', marginBottom: 14, lineHeight: 1.75 }}>
              {prop.warnings.map((w, i) => (
                <div key={i} style={{ color: C.warn, fontSize: 12.5 }}>⚠️ {w}</div>
              ))}
            </div>
          )}

          {prop.dailyLimit && (
            <Gauge label="הפסד היום" limit={prop.dailyLimit}
              used={prop.dailyUsedPct}
              detail={prop.todayPnl < 0 ? usd(prop.todayPnl) : usd(prop.todayPnl)} />
          )}
          {prop.ddLimit && (
            <Gauge label={`דראודאון ${acc.drawdownType === 'trailing' ? '(מהשיא)' : '(מההתחלה)'}`}
              limit={prop.ddLimit} used={prop.ddUsedPct} detail={usd(-prop.ddNow)} />
          )}
          {prop.target && (
            <Gauge label="יעד הרווח" used={Math.max(0, prop.targetPct)}
              detail={`${usd(prop.pnl)} / ${usd(prop.target)}`} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div style={{ background: C.card2, borderRadius: 10, padding: '11px 12px' }}>
              <div style={{ color: C.muted, fontSize: 10.5 }}>סיכון לעסקה</div>
              <div style={{ color: C.accent, fontSize: 17, fontWeight: 700 }}>
                {usd(riskPerTrade(acc, prop.balance))}
              </div>
              <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{acc.riskPct}% מהיתרה</div>
            </div>
            <div style={{ background: C.card2, borderRadius: 10, padding: '11px 12px' }}>
              <div style={{ color: C.muted, fontSize: 10.5 }}>עסקאות עד גבול יומי</div>
              <div style={{ color: C.text, fontSize: 17, fontWeight: 700 }}>
                {prop.dailyLimit
                  ? Math.max(0, Math.floor((prop.dailyLimit + prop.todayPnl) / Math.max(1, riskPerTrade(acc, prop.balance))))
                  : '—'}
              </div>
              <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>בהפסד מלא</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
