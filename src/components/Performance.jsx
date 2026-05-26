import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { C, PIE_COLORS } from '../theme';
import { Card, SectionTitle, StatBox } from './UI';

const TT = { background: '#111118', border: `1px solid #1e1e2e`, borderRadius: 8, color: '#e8e0d0', fontSize: 12 };

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ── Calendar view ─────────────────────────────────────────────
function CalendarView({ trades, dailyLogs }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map data by date
  const tradesByDate = {};
  trades.forEach(t => {
    if (!tradesByDate[t.date]) tradesByDate[t.date] = [];
    tradesByDate[t.date].push(t);
  });
  const logsByDate = {};
  dailyLogs.forEach(l => { logsByDate[l.date] = l; });

  const getDayColor = (dateStr) => {
    const ts = tradesByDate[dateStr] || [];
    const log = logsByDate[dateStr];
    if (ts.length > 0) {
      const pips = ts.reduce((s, t) => s + (t.pips || 0), 0);
      return pips > 0 ? C.green : pips < 0 ? C.red : C.muted;
    }
    // Daily log only — always blue, never red
    if (log) return C.blue;
    return null;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, padding: '0 8px' }}>›</button>
        <div style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>{monthName}</div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, padding: '0 8px' }}>‹</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', color: C.muted, fontSize: 10, paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const color = getDayColor(dateStr);
          const ts = tradesByDate[dateStr] || [];
          const pips = ts.reduce((s, t) => s + (t.pips || 0), 0);
          const isToday = dateStr === new Date().toISOString().slice(0, 10);

          return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 6, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: color ? color + '22' : C.card2,
              border: `1px solid ${isToday ? C.accent : color ? color + '55' : C.border}`,
              position: 'relative'
            }}>
              <div style={{ color: isToday ? C.accent : C.text, fontSize: 12, fontWeight: isToday ? 700 : 400 }}>{day}</div>
              {ts.length > 0 && (
                <div style={{ color: pips > 0 ? C.green : C.red, fontSize: 9, fontWeight: 600 }}>
                  {pips > 0 ? '+' : ''}{pips.toFixed(0)}p
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[[C.green, 'יום רווחי'], [C.red, 'יום הפסד'], [C.blue, 'יומן יומי'], [C.muted, 'ריק']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c + '55', border: `1px solid ${c}` }} />
            {l}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Revenge trading detector ──────────────────────────────────
function RevengeDetector({ trades }) {
  const sorted = [...trades].sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
  const revengeList = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.result === 'loss' && prev.savedAt && curr.savedAt) {
      const diff = (new Date(curr.savedAt) - new Date(prev.savedAt)) / 60000; // minutes
      if (diff <= 60 && diff >= 0) {
        revengeList.push({ trade: curr, minutesAfter: Math.round(diff), prevLoss: prev });
      }
    }
  }

  if (revengeList.length === 0) {
    return (
      <Card style={{ background: '#081a08', borderColor: C.green + '44' }}>
        <SectionTitle>🛡 Revenge Trading Detector</SectionTitle>
        <div style={{ textAlign: 'center', color: C.green, padding: '16px 0', fontSize: 14 }}>
          ✅ לא זוהו עסקאות Revenge — עבודה טובה!
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ background: '#1a0808', borderColor: C.red + '44' }}>
      <SectionTitle>⚠️ Revenge Trading Detector — {revengeList.length} זוהו</SectionTitle>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>עסקאות שנלקחו תוך 60 דקות מהפסד:</div>
      {revengeList.map((r, i) => (
        <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ color: C.text, fontWeight: 600 }}>{r.trade.pair}</span>
              <span style={{ color: C.muted, fontSize: 12, marginRight: 8 }}>{r.trade.date}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: C.warn, fontSize: 12 }}>{r.minutesAfter} דקות אחרי הפסד</span>
              <span style={{ color: r.trade.pips > 0 ? C.green : C.red, fontWeight: 700 }}>
                {r.trade.pips > 0 ? '+' : ''}{r.trade.pips}p
              </span>
            </div>
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            קדם לה הפסד של {r.prevLoss.pips}p ב-{r.prevLoss.pair}
          </div>
        </div>
      ))}
    </Card>
  );
}

// ── Main Performance ──────────────────────────────────────────
export default function Performance({ data }) {
  const trades = data.trades || [];
  const dailyLogs = data.dailyLogs || [];
  const total = trades.length;
  const [activeSection, setActiveSection] = useState('overview');

  if (total === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
        <div style={{ color: C.muted, fontSize: 16 }}>אין עדיין עסקאות מוקלטות</div>
      </Card>
    );
  }

  // ── Core stats ────────────────────────────────────────────
  const wins = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const bes = trades.filter(t => t.result === 'be').length;
  const allPips = trades.reduce((s, t) => s + (t.pips || 0), 0);
  const winRate = ((wins / total) * 100).toFixed(0);
  const avgDisc = (trades.reduce((s, t) => s + (t.disciplineScore || 0), 0) / total).toFixed(1);

  const winPips = trades.filter(t => t.pips > 0).reduce((s, t) => s + t.pips, 0);
  const lossPips = Math.abs(trades.filter(t => t.pips < 0).reduce((s, t) => s + t.pips, 0));
  const avgWin = wins > 0 ? (winPips / wins).toFixed(1) : 0;
  const avgLoss = losses > 0 ? (lossPips / losses).toFixed(1) : 0;
  const profitFactor = lossPips > 0 ? (winPips / lossPips).toFixed(2) : '∞';
  const rrRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '∞';

  // ── R-Multiple ────────────────────────────────────────────
  const rMultiples = [];
  trades.forEach(t => {
    if (t.sl && t.entry && t.pips !== undefined) {
      const slPips = Math.abs(parseFloat(t.entry) - parseFloat(t.sl)) * 100;
      if (slPips > 0) {
        const r = parseFloat((t.pips / slPips).toFixed(2));
        rMultiples.push(r);
      }
    }
  });
  const rBuckets = { '-2R+': 0, '-1R': 0, '0R': 0, '1R': 0, '2R': 0, '3R+': 0 };
  rMultiples.forEach(r => {
    if (r <= -2) rBuckets['-2R+']++;
    else if (r < 0) rBuckets['-1R']++;
    else if (r === 0) rBuckets['0R']++;
    else if (r < 1.5) rBuckets['1R']++;
    else if (r < 2.5) rBuckets['2R']++;
    else rBuckets['3R+']++;
  });
  const rChartData = Object.entries(rBuckets).map(([name, value]) => ({ name, value }));
  const avgR = rMultiples.length > 0 ? (rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2) : '—';

  // ── By Hour ───────────────────────────────────────────────
  const byHour = {};
  trades.forEach(t => {
    if (!t.time) return;
    const hour = t.time.slice(0, 2);
    if (!byHour[hour]) byHour[hour] = { hour, pips: 0, count: 0, wins: 0 };
    byHour[hour].pips += t.pips || 0;
    byHour[hour].count++;
    if (t.result === 'win') byHour[hour].wins++;
  });
  const hourChart = Object.values(byHour).sort((a, b) => a.hour.localeCompare(b.hour)).map(h => ({
    hour: `${h.hour}:00`,
    פיפס: parseFloat(h.pips.toFixed(1)),
    winRate: h.count > 0 ? Math.round((h.wins / h.count) * 100) : 0,
    עסקאות: h.count,
  }));

  // ── By Day of Week ────────────────────────────────────────
  const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const byDay = DAY_NAMES.map((name, i) => ({ name, pips: 0, count: 0, wins: 0, day: i }));
  trades.forEach(t => {
    const d = new Date(t.date).getDay();
    byDay[d].pips += t.pips || 0;
    byDay[d].count++;
    if (t.result === 'win') byDay[d].wins++;
  });
  const dayChart = byDay.filter(d => d.count > 0).map(d => ({
    name: d.name,
    פיפס: parseFloat(d.pips.toFixed(1)),
    winRate: Math.round((d.wins / d.count) * 100),
    עסקאות: d.count,
  }));

  // ── Cumulative & Weekly ───────────────────────────────────
  let cum = 0;
  const pipsLine = trades.map((t, i) => {
    cum += t.pips || 0;
    return { name: `#${i + 1}`, cumPips: parseFloat(cum.toFixed(1)), pips: t.pips || 0 };
  }).slice(-30);

  const byWeek = {};
  trades.forEach(t => {
    const wk = getWeekKey(t.date);
    if (!byWeek[wk]) byWeek[wk] = { week: wk, pips: 0, disc: [], wins: 0, count: 0 };
    byWeek[wk].pips += t.pips || 0;
    byWeek[wk].disc.push(t.disciplineScore || 0);
    byWeek[wk].count++;
    if (t.result === 'win') byWeek[wk].wins++;
  });
  const weeklyChart = Object.values(byWeek).slice(-10).map(w => ({
    week: w.week.slice(5),
    פיפס: parseFloat(w.pips.toFixed(1)),
    משמעת: w.disc.length ? parseFloat((w.disc.reduce((a, b) => a + b, 0) / w.disc.length).toFixed(1)) : 0,
  }));

  const pieData = [
    { name: 'רווח', value: wins },
    { name: 'הפסד', value: losses },
    { name: 'BE', value: bes },
  ].filter(d => d.value > 0);

  const SECTIONS = [
    { id: 'overview', label: '📊 סקירה' },
    { id: 'calendar', label: '📅 לוח שנה' },
    { id: 'timing', label: '⏰ תזמון' },
    { id: 'rr', label: '📐 R-Multiple' },
    { id: 'revenge', label: '🛡 Revenge' },
  ];

  return (
    <div>
      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            flexShrink: 0, padding: '8px 14px', borderRadius: 20,
            border: `1px solid ${activeSection === s.id ? C.accent : C.border}`,
            background: activeSection === s.id ? C.accent + '18' : 'transparent',
            color: activeSection === s.id ? C.accent : C.muted,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            transition: 'all 0.15s', whiteSpace: 'nowrap'
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
            <StatBox label="סה״כ פיפס" value={allPips >= 0 ? '+' + allPips.toFixed(0) : allPips.toFixed(0)} color={allPips >= 0 ? C.green : C.red} />
            <StatBox label="Win Rate" value={`${winRate}%`} color={C.blue} />
            <StatBox label="ממוצע משמעת" value={`${avgDisc}/10`} color={C.accent} />
            <StatBox label="סה״כ עסקאות" value={total} color={C.text} />
          </div>

          {/* Profit factor & RR */}
          <Card>
            <SectionTitle>יחס רווח / הפסד</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
              <div style={{ background: C.card2, borderRadius: 9, padding: '12px', textAlign: 'center' }}>
                <div style={{ color: C.green, fontSize: 22, fontWeight: 700 }}>{avgWin}p</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>ממוצע רווח</div>
              </div>
              <div style={{ background: C.card2, borderRadius: 9, padding: '12px', textAlign: 'center' }}>
                <div style={{ color: C.red, fontSize: 22, fontWeight: 700 }}>{avgLoss}p</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>ממוצע הפסד</div>
              </div>
              <div style={{ background: C.card2, borderRadius: 9, padding: '12px', textAlign: 'center' }}>
                <div style={{ color: C.accent, fontSize: 22, fontWeight: 700 }}>{rrRatio}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>יחס R:R ממוצע</div>
              </div>
              <div style={{ background: C.card2, borderRadius: 9, padding: '12px', textAlign: 'center' }}>
                <div style={{ color: parseFloat(profitFactor) >= 1.5 ? C.green : C.warn, fontSize: 22, fontWeight: 700 }}>{profitFactor}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Profit Factor</div>
              </div>
            </div>
            <div style={{ color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
              Profit Factor {'>'} 1.5 = מערכת רווחית • {'>'} 2.0 = מצוינת
            </div>
          </Card>

          {/* Pie */}
          {pieData.length > 0 && (
            <Card>
              <SectionTitle>התפלגות תוצאות</SectionTitle>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={TT} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
                {[['רווח', C.green, wins], ['הפסד', C.red, losses], ['BE', C.muted, bes]].map(([l, c, v]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                    {l}: <span style={{ color: c, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Cumulative pips */}
          {pipsLine.length > 1 && (
            <Card>
              <SectionTitle>פיפס מצטבר</SectionTitle>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pipsLine} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                    <Tooltip contentStyle={TT} />
                    <Line type="monotone" dataKey="cumPips" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3 }} name="פיפס מצטבר" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Weekly */}
          {weeklyChart.length > 1 && (
            <Card>
              <SectionTitle>פיפס שבועי</SectionTitle>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="פיפס" radius={[5, 5, 0, 0]}>
                      {weeklyChart.map((e, i) => <Cell key={i} fill={e.פיפס >= 0 ? C.accent : C.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── CALENDAR ── */}
      {activeSection === 'calendar' && (
        <>
          <CalendarView trades={trades} dailyLogs={dailyLogs} />
          {/* Monthly summary */}
          <Card>
            <SectionTitle>סיכום חודשי</SectionTitle>
            {(() => {
              const byMonth = {};
              trades.forEach(t => {
                const m = t.date.slice(0, 7);
                if (!byMonth[m]) byMonth[m] = { month: m, pips: 0, count: 0, wins: 0 };
                byMonth[m].pips += t.pips || 0;
                byMonth[m].count++;
                if (t.result === 'win') byMonth[m].wins++;
              });
              return Object.values(byMonth).reverse().slice(0, 6).map(m => (
                <div key={m.month} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>{m.month}</span>
                    <span style={{ color: m.pips >= 0 ? C.green : C.red, fontWeight: 700, fontSize: 20 }}>
                      {m.pips >= 0 ? '+' : ''}{m.pips.toFixed(0)}p
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ color: C.muted, fontSize: 13 }}>{m.count} עסקאות</span>
                    <span style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>{Math.round((m.wins / m.count) * 100)}% Win</span>
                  </div>
                </div>
              ));
            })()}
          </Card>
        </>
      )}

      {/* ── TIMING ── */}
      {activeSection === 'timing' && (
        <>
          {hourChart.length > 0 ? (
            <Card>
              <SectionTitle>⏰ ביצועים לפי שעה</SectionTitle>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
                הכי רווחי: <span style={{ color: C.green, fontWeight: 700 }}>
                  {hourChart.reduce((a, b) => a.פיפס > b.פיפס ? a : b).hour}
                </span>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="hour" tick={{ fill: C.muted, fontSize: 9 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="פיפס" radius={[4, 4, 0, 0]}>
                      {hourChart.map((e, i) => <Cell key={i} fill={e.פיפס >= 0 ? C.green : C.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 10 }}>
                {hourChart.map(h => (
                  <div key={h.hour} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                    <span style={{ color: C.muted }}>{h.hour}</span>
                    <span style={{ color: C.text }}>{h.עסקאות} עסקאות</span>
                    <span style={{ color: C.blue }}>{h.winRate}% Win</span>
                    <span style={{ color: h.פיפס >= 0 ? C.green : C.red, fontWeight: 600 }}>{h.פיפס >= 0 ? '+' : ''}{h.פיפס}p</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card><div style={{ color: C.muted, textAlign: 'center', padding: 20 }}>אין מספיק נתוני שעה — ודא שאתה מזין שעה בעסקאות</div></Card>
          )}

          {dayChart.length > 0 && (
            <Card>
              <SectionTitle>📅 ביצועים לפי יום בשבוע</SectionTitle>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
                הכי רווחי: <span style={{ color: C.green, fontWeight: 700 }}>
                  {dayChart.reduce((a, b) => a.פיפס > b.פיפס ? a : b).name}
                </span>
              </div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="פיפס" radius={[4, 4, 0, 0]}>
                      {dayChart.map((e, i) => <Cell key={i} fill={e.פיפס >= 0 ? C.accent : C.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 10 }}>
                {dayChart.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                    <span style={{ color: C.text, fontWeight: 600, minWidth: 50 }}>{d.name}</span>
                    <span style={{ color: C.muted }}>{d.עסקאות} עסקאות</span>
                    <span style={{ color: C.blue }}>{d.winRate}% Win</span>
                    <span style={{ color: d.פיפס >= 0 ? C.green : C.red, fontWeight: 600 }}>{d.פיפס >= 0 ? '+' : ''}{d.פיפס}p</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── R-MULTIPLE ── */}
      {activeSection === 'rr' && (
        <>
          <Card>
            <SectionTitle>📐 R-Multiple Distribution</SectionTitle>
            {rMultiples.length === 0 ? (
              <div style={{ color: C.muted, textAlign: 'center', padding: 20, fontSize: 13 }}>
                כדי לחשב R-Multiple צריך Entry ו-SL מוזנים בעסקאות
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div style={{ background: C.card2, borderRadius: 9, padding: 12, textAlign: 'center' }}>
                    <div style={{ color: C.accent, fontSize: 22, fontWeight: 700 }}>{avgR}R</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>ממוצע R לעסקה</div>
                  </div>
                  <div style={{ background: C.card2, borderRadius: 9, padding: 12, textAlign: 'center' }}>
                    <div style={{ color: C.green, fontSize: 22, fontWeight: 700 }}>
                      {rChartData.find(r => r.name === '2R')?.value || 0}
                    </div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>עסקאות ב-2R</div>
                  </div>
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
                      <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} name="עסקאות">
                        {rChartData.map((e, i) => (
                          <Cell key={i} fill={e.name.startsWith('-') ? C.red : e.name === '0R' ? C.muted : e.name === '3R+' ? C.green : C.accent} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                  יעד: רוב העסקאות אמורות להיות ב-2R ומעלה
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {/* ── REVENGE ── */}
      {activeSection === 'revenge' && (
        <RevengeDetector trades={trades} />
      )}
    </div>
  );
}
