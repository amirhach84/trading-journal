import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { C } from '../theme';
import { Card, SectionTitle } from './UI';
import { netOf, isClosed } from '../accountBalance';

/* ------------------------------------------------------------------
   Dashboard — סקירה כספית בדולרים
   <Dashboard data={data} settings={settings} />
   ------------------------------------------------------------------ */

const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DAYS_HE = ['א','ב','ג','ד','ה','ו','ש'];

const usd = (v, dec = 0) =>
  `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// רווח והפסד מיוחסים ליום הסגירה
const pnlDate = (t) => t.closeDate || t.date;

export default function Dashboard({ data, settings }) {
  const cfg = useMemo(() => settings || data.settings || {}, [settings, data.settings]);
  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  const trades = useMemo(
    () => (data.trades || []).filter(isClosed).filter(t => pnlDate(t)),
    [data.trades]
  );

  /* ---------- מדדים ---------- */
  const M = useMemo(() => {
    const sorted = [...trades].sort((a, b) => pnlDate(a).localeCompare(pnlDate(b)));
    const pnls = sorted.map(t => netOf(t, cfg));
    const net = pnls.reduce((a, b) => a + b, 0);

    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const grossWin = wins.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;

    // עקומה יומית מצטברת
    const byDay = {};
    sorted.forEach((t, i) => {
      const k = pnlDate(t);
      byDay[k] = (byDay[k] || 0) + pnls[i];
    });
    let cum = 0, peak = 0, maxDD = 0;
    const curve = Object.keys(byDay).sort().map(k => {
      cum += byDay[k];
      peak = Math.max(peak, cum);
      maxDD = Math.min(maxDD, cum - peak);
      return { date: k, label: k.slice(5).replace('-', '/'), cum: +cum.toFixed(2) };
    });

    // רצף ימים ורצף עסקאות
    const dayKeys = Object.keys(byDay).sort().reverse();
    let dayStreak = 0;
    for (const k of dayKeys) { if (byDay[k] > 0) dayStreak++; else break; }
    let tradeStreak = 0;
    for (let i = pnls.length - 1; i >= 0; i--) { if (pnls[i] > 0) tradeStreak++; else break; }

    const profitDays = Object.values(byDay).filter(v => v > 0).length;
    const totalDays = Object.keys(byDay).length;

    return {
      net, count: sorted.length,
      wins: wins.length, losses: losses.length,
      winRate: pnls.length ? (wins.length / pnls.length) * 100 : 0,
      avgWin, avgLoss,
      winLossRatio: avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? Infinity : 0),
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0),
      maxDD, recovery: maxDD < 0 ? net / Math.abs(maxDD) : 0,
      dayStreak, tradeStreak,
      byDay, curve,
      profitDays, totalDays,
      dayWinRate: totalDays ? (profitDays / totalDays) * 100 : 0,
    };
  }, [trades, cfg]);

  /* ---------- ציון מורכב ---------- */
  const score = useMemo(() => {
    const clamp = (v) => Math.max(0, Math.min(100, v));
    const axes = [
      { k: 'Win %',        v: clamp(M.winRate * 1.8) },
      { k: 'Profit factor',v: clamp((M.profitFactor === Infinity ? 3 : M.profitFactor) * 33) },
      { k: 'יחס רווח/הפסד', v: clamp((M.winLossRatio === Infinity ? 3 : M.winLossRatio) * 33) },
      { k: 'Recovery',     v: clamp(M.recovery * 25) },
      { k: 'Max drawdown', v: clamp(M.net > 0 ? 100 - (Math.abs(M.maxDD) / Math.max(M.net, 1)) * 40 : 20) },
      { k: 'עקביות',        v: clamp(M.dayWinRate * 1.5) },
    ];
    return { axes, total: axes.reduce((a, b) => a + b.v, 0) / axes.length };
  }, [M]);

  /* ---------- לוח חודשי ---------- */
  const cal = useMemo(() => {
    const first = new Date(viewY, viewM, 1).getDay();
    const days = new Date(viewY, viewM + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let day = 1; day <= days; day++) {
      const d = new Date(viewY, viewM, day);
      const k = key(d);
      const ts = trades.filter(t => pnlDate(t) === k);
      const pnl = ts.reduce((s, t) => s + netOf(t, cfg), 0);
      const w = ts.filter(t => netOf(t, cfg) > 0).length;
      cells.push({ day, k, pnl, n: ts.length, winRate: ts.length ? (w / ts.length) * 100 : 0 });
    }
    // חלוקה לשבועות + סיכום שבועי
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      const row = cells.slice(i, i + 7);
      while (row.length < 7) row.push(null);
      const live = row.filter(c => c && c.n > 0);
      weeks.push({
        row,
        pnl: live.reduce((s, c) => s + c.pnl, 0),
        days: live.length,
      });
    }
    const monthPnl = cells.filter(Boolean).reduce((s, c) => s + c.pnl, 0);
    const monthDays = cells.filter(c => c && c.n > 0).length;
    return { weeks, monthPnl, monthDays };
  }, [trades, viewY, viewM, cfg]);

  const prevMonth = () => viewM === 0 ? (setViewM(11), setViewY(y => y - 1)) : setViewM(m => m - 1);
  const nextMonth = () => viewM === 11 ? (setViewM(0), setViewY(y => y + 1)) : setViewM(m => m + 1);

  const tip = {
    contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, direction: 'rtl' },
    labelStyle: { color: C.muted }, itemStyle: { color: C.text },
  };

  /* ---------- כרטיס מדד ---------- */
  const Stat = ({ label, value, color, children }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 15px' }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 7 }}>{label}</div>
      <div style={{ color: color || C.text, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{value}</div>
      {children}
    </div>
  );

  const MiniBar = ({ pct, good, bad }) => (
    <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 9, background: C.border }}>
      <div style={{ width: `${pct}%`, background: good }} />
      <div style={{ width: `${100 - pct}%`, background: bad }} />
    </div>
  );

  return (
    <div style={{ direction: 'rtl' }}>

      {/* ---------- שורת מדדים ---------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <Stat label="רווח נקי" value={usd(M.net)} color={M.net >= 0 ? C.green : C.red}>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 5 }}>{M.count} עסקאות</div>
        </Stat>

        <Stat label="אחוז הצלחה" value={`${M.winRate.toFixed(1)}%`} color={C.blue}>
          <MiniBar pct={M.winRate} good={C.green} bad={C.red} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 10, marginTop: 4 }}>
            <span>{M.losses}</span><span>{M.wins}</span>
          </div>
        </Stat>

        <Stat label="יחס רווח להפסד"
          value={M.winLossRatio === Infinity ? '∞' : M.winLossRatio.toFixed(2)}
          color={M.winLossRatio >= 2 ? C.green : M.winLossRatio >= 1 ? C.warn : C.red}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 7 }}>
            <span style={{ color: C.red }}>{usd(-M.avgLoss)}</span>
            <span style={{ color: C.green }}>{usd(M.avgWin)}</span>
          </div>
        </Stat>

        <Stat label="פקטור רווח"
          value={M.profitFactor === Infinity ? '∞' : M.profitFactor.toFixed(2)}
          color={M.profitFactor >= 1.5 ? C.green : M.profitFactor >= 1 ? C.warn : C.red}>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 5 }}>רווח ברוטו ÷ הפסד ברוטו</div>
        </Stat>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <Stat label="ירידה מקסימלית" value={usd(M.maxDD)} color={C.red}>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 5 }}>
            Recovery {M.recovery.toFixed(2)}
          </div>
        </Stat>
        <Stat label="רצף נוכחי" value={`${M.dayStreak} ימים`} color={M.dayStreak > 0 ? C.green : C.muted}>
          <div style={{ color: C.muted, fontSize: 10, marginTop: 5 }}>{M.tradeStreak} עסקאות ברצף</div>
        </Stat>
      </div>

      {/* ---------- עקומת הון ---------- */}
      <Card>
        <SectionTitle>רווח מצטבר</SectionTitle>
        {M.curve.length > 1 ? (
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={M.curve} margin={{ top: 5, right: 6, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="dashCum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 9 }} stroke={C.border} minTickGap={34} />
              <YAxis tick={{ fill: C.muted, fontSize: 9 }} stroke={C.border} />
              <Tooltip {...tip} formatter={(v) => [usd(v, 2), 'מצטבר']} />
              <Area type="monotone" dataKey="cum" stroke={C.green} strokeWidth={2} fill="url(#dashCum)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>אין מספיק נתונים.</div>
        )}
      </Card>

      {/* ---------- ציון ---------- */}
      <Card>
        <SectionTitle>ציון ביצועים</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={score.axes} outerRadius="72%">
            <PolarGrid stroke={C.border} />
            <PolarAngleAxis dataKey="k" tick={{ fill: C.muted, fontSize: 10 }} />
            <Radar dataKey="v" stroke={C.accent} fill={C.accent} fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <span style={{ color: C.muted, fontSize: 11 }}>הציון שלך</span>
            <span style={{ color: C.accent, fontSize: 26, fontWeight: 800 }}>{score.total.toFixed(1)}</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
            <div style={{ width: `${score.total}%`, height: '100%',
              background: `linear-gradient(90deg, ${C.red}, ${C.warn}, ${C.green})` }} />
          </div>
        </div>
      </Card>

      {/* ---------- לוח חודשי ---------- */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={nextMonth} style={navBtn}>›</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.accent, minWidth: 116, textAlign: 'center' }}>
              {MONTHS_HE[viewM]} {viewY}
            </span>
            <button onClick={prevMonth} style={navBtn}>‹</button>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: cal.monthPnl >= 0 ? C.green : C.red, fontSize: 16, fontWeight: 700 }}>
              {usd(cal.monthPnl)}
            </div>
            <div style={{ color: C.muted, fontSize: 10 }}>{cal.monthDays} ימי מסחר</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, direction: 'ltr' }}>
          {/* הרשת */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
              {DAYS_HE.map(d => (
                <div key={d} style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>{d}</div>
              ))}
            </div>
            {cal.weeks.map((w, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
                {w.row.map((c, ci) => {
                  if (!c) return <div key={ci} />;
                  const has = c.n > 0;
                  const pos = c.pnl > 0;
                  return (
                    <div key={ci} style={{
                      aspectRatio: '1',
                      borderRadius: 7,
                      border: `1px solid ${has ? (pos ? C.green + '66' : C.red + '66') : C.border}`,
                      background: has ? (pos ? C.green + '18' : C.red + '18') : 'transparent',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', padding: 2,
                    }}>
                      <span style={{ fontSize: 9, color: has ? C.text : C.muted, lineHeight: 1 }}>{c.day}</span>
                      {has && (
                        <>
                          <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3,
                            color: pos ? C.green : C.red }}>{usd(c.pnl)}</span>
                          <span style={{ fontSize: 7, color: C.muted, lineHeight: 1 }}>
                            {c.n}·{c.winRate.toFixed(0)}%
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* סיכום שבועי */}
          <div style={{ width: 62, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginBottom: 3 }}>שבוע</div>
            {cal.weeks.map((w, i) => (
              <div key={i} style={{
                aspectRatio: '1', marginBottom: 3, borderRadius: 7,
                background: C.card2, border: `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 8, color: C.muted, lineHeight: 1 }}>{i + 1}</span>
                <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.4,
                  color: w.days === 0 ? C.muted : w.pnl >= 0 ? C.green : C.red }}>
                  {w.days ? usd(w.pnl) : '—'}
                </span>
                <span style={{ fontSize: 7, color: C.muted, lineHeight: 1 }}>{w.days} ימים</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

const navBtn = {
  background: C.card2, border: `1px solid ${C.border}`, color: C.muted,
  width: 30, height: 30, borderRadius: 7, cursor: 'pointer', fontSize: 15,
  fontFamily: 'inherit',
};
