import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend
} from 'recharts';
import { C, PIE_COLORS } from '../theme';
import { Card, SectionTitle, StatBox } from './UI';

const TT_STYLE = {
  background: '#111118', border: `1px solid #1e1e2e`,
  borderRadius: 8, color: '#e8e0d0', fontSize: 12
};

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function Performance({ data }) {
  const trades = data.trades;
  const total = trades.length;

  if (total === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
        <div style={{ color: C.muted, fontSize: 16 }}>אין עדיין עסקאות מוקלטות</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>הוסף עסקאות בטאב "אחרי עסקה"</div>
      </Card>
    );
  }

  const wins   = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const bes    = trades.filter(t => t.result === 'be').length;
  const allPips = trades.reduce((s, t) => s + (t.pips || 0), 0);
  const winRate = ((wins / total) * 100).toFixed(0);
  const avgDisc = (trades.reduce((s, t) => s + (t.disciplineScore || 0), 0) / total).toFixed(1);
  const violations = trades.filter(t => t.violatedRule).length;

  // Cumulative pips
  let cumPips = 0;
  const pipsLine = trades.map((t, i) => {
    cumPips += t.pips || 0;
    return { name: `#${i + 1}`, cumPips: parseFloat(cumPips.toFixed(1)), pips: t.pips || 0 };
  }).slice(-30);

  // Weekly aggregation
  const byWeek = {};
  trades.forEach(t => {
    const wk = getWeekKey(t.date);
    if (!byWeek[wk]) byWeek[wk] = { week: wk, pips: 0, disc: [], setups: 0, wins: 0 };
    byWeek[wk].pips += t.pips || 0;
    byWeek[wk].disc.push(t.disciplineScore || 0);
    byWeek[wk].setups++;
    if (t.result === 'win') byWeek[wk].wins++;
  });
  const weeklyChart = Object.values(byWeek).slice(-10).map(w => ({
    week: w.week.slice(5),
    פיפס: parseFloat(w.pips.toFixed(1)),
    משמעת: w.disc.length ? parseFloat((w.disc.reduce((a, b) => a + b, 0) / w.disc.length).toFixed(1)) : 0,
    setups: w.setups,
  }));

  // Discipline over time
  const discLine = trades.slice(-20).map((t, i) => ({
    name: `#${i + 1}`,
    משמעת: t.disciplineScore || 0,
    סבלנות: t.patienceScore || 0,
    רגש: t.emotionScore || 0,
  }));

  const pieData = [
    { name: 'רווח', value: wins },
    { name: 'הפסד', value: losses },
    { name: 'BE', value: bes },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatBox label="סה״כ פיפס" value={allPips >= 0 ? '+' + allPips.toFixed(0) : allPips.toFixed(0)} color={allPips >= 0 ? C.green : C.red} />
        <StatBox label="Win Rate" value={`${winRate}%`} color={C.blue} />
        <StatBox label="סה״כ עסקאות" value={total} color={C.text} />
        <StatBox label="ממוצע משמעת" value={`${avgDisc}/10`} color={C.accent} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatBox label="רווח" value={wins} color={C.green} />
        <StatBox label="הפסד" value={losses} color={C.red} />
        <StatBox label="חריגות" value={violations} color={violations > 0 ? C.red : C.muted} />
      </div>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <Card>
          <SectionTitle>התפלגות תוצאות</SectionTitle>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} formatter={(v, n) => [`${v} עסקאות`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 4 }}>
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
                <Tooltip contentStyle={TT_STYLE} />
                <Line type="monotone" dataKey="cumPips" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3, fill: C.accent }} name="פיפס מצטבר" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Weekly pips bar */}
      {weeklyChart.length > 1 && (
        <Card>
          <SectionTitle>פיפס שבועי</SectionTitle>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="week" tick={{ fill: C.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                <Tooltip contentStyle={TT_STYLE} />
                <Bar dataKey="פיפס" radius={[5, 5, 0, 0]}>
                  {weeklyChart.map((entry, i) => (
                    <Cell key={i} fill={entry.פיפס >= 0 ? C.accent : C.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* 100 pip target reference */}
          <div style={{ textAlign: 'center', color: C.muted, fontSize: 11, marginTop: 6 }}>יעד שבועי: 100 פיפס</div>
        </Card>
      )}

      {/* Discipline over time */}
      {discLine.length > 1 && (
        <Card>
          <SectionTitle>ציוני משמעת לאורך זמן</SectionTitle>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={discLine} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fill: C.muted, fontSize: 10 }} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
                <Line type="monotone" dataKey="משמעת" stroke={C.accent} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="סבלנות" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="רגש" stroke={C.purple} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Violations */}
      {trades.filter(t => t.violatedRule).length > 0 && (
        <Card style={{ borderColor: C.red + '44', background: '#0f0808' }}>
          <SectionTitle>חריגות מוקלטות 🚨</SectionTitle>
          {trades.filter(t => t.violatedRule).reverse().map(t => (
            <div key={t.id} style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.red }}>{t.date} — {t.pair}</span>
                <span style={{ color: t.pips > 0 ? C.green : C.red }}>{t.pips > 0 ? '+' : ''}{t.pips}p</span>
              </div>
              {t.mentalMistake && <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{t.mentalMistake}</div>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
