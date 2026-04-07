import { useState, useEffect, useCallback } from 'react';
import { C } from './theme';
import { loadData, saveData } from './storage';
import { Toast } from './components/UI';
import PreTrade    from './components/PreTrade';
import PostTrade   from './components/PostTrade';
import Weekly      from './components/Weekly';
import Performance from './components/Performance';
import Rules       from './components/Rules';
import DailyLog    from './components/DailyLog';
import History     from './components/History';

const TABS = [
  { id: 'daily', icon: '📓', label: 'יומי' },
  { id: 'pre',   icon: '📋', label: 'לפני' },
  { id: 'post',  icon: '📝', label: 'אחרי' },
  { id: 'week',  icon: '📅', label: 'שבועי' },
  { id: 'perf',  icon: '📊', label: 'ביצועים' },
  { id: 'history', icon: '🗂', label: 'היסטוריה' },
  { id: 'rules', icon: '🚨', label: 'חוקים' },
];

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('pre');
  const [toast, setToast] = useState(null);

  useEffect(() => { setData(loadData()); }, []);

  const save = useCallback((newData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  if (!data) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontSize: 20, fontFamily: 'serif', direction: 'rtl' }}>
        טוען...
      </div>
    );
  }

  // Computed stats
  const weekStart = getWeekStart();
  const weekTrades = data.trades.filter(t => new Date(t.date) >= weekStart);
  const weekPips   = weekTrades.reduce((s, t) => s + (t.pips || 0), 0);
  const weekSetups = weekTrades.length;
  const weekStopped = weekPips >= 100;

  const isCooldown = !!(data.cooldownUntil && new Date() < new Date(data.cooldownUntil));

  // Daily streak
  const dailyLogs = data.dailyLogs || [];
  let streak = 0;
  const sortedLogs = [...dailyLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const log of sortedLogs) { if ((log.disciplineScore || 0) >= 6) streak++; else break; }

  const totalTrades = data.trades.length;
  const wins = data.trades.filter(t => t.result === 'win').length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const allPips = data.trades.reduce((s, t) => s + (t.pips || 0), 0);
  const avgDisc = totalTrades > 0
    ? (data.trades.reduce((s, t) => s + (t.disciplineScore || 0), 0) / totalTrades).toFixed(1)
    : '—';

  const tabProps = { data, save, showToast };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', direction: 'rtl', fontFamily: "'Noto Serif Hebrew', serif", color: C.text, paddingBottom: 80 }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, #0d0d1a 0%, ${C.bg} 100%)`, borderBottom: `1px solid ${C.border}`, padding: '20px 16px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: 700, marginBottom: 3 }}>מסחר • משמעת • 30 יום</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>יומן המשמעת</h1>
            </div>
            <div style={{ textAlign: 'left' }}>
              {isCooldown && (
                <div style={{ background: C.red + '22', border: `1px solid ${C.red}44`, borderRadius: 8, padding: '5px 10px', color: C.red, fontSize: 11, fontWeight: 700 }}>
                  🚫 עצירת 48ש׳
                </div>
              )}
              {weekStopped && !isCooldown && (
                <div style={{ background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 8, padding: '5px 10px', color: C.green, fontSize: 11, fontWeight: 700 }}>
                  ✅ 100p הושגו
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              { label: 'פיפס שבוע', value: `${weekPips.toFixed(0)}/100`, color: weekStopped ? C.red : weekPips > 60 ? C.warn : C.green },
              { label: 'Setups', value: `${weekSetups}/2`, color: weekSetups >= 2 ? C.red : C.text },
              { label: 'Win%', value: `${winRate}%`, color: C.blue },
              { label: 'סה״כ פיפס', value: allPips >= 0 ? `+${allPips.toFixed(0)}` : allPips.toFixed(0), color: allPips >= 0 ? C.green : C.red },
              { label: '🎯 משמעת', value: avgDisc, color: C.accent },
            { label: '🔥 Streak', value: streak > 0 ? streak + 'd' : '—', color: streak >= 5 ? C.green : C.text },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', textAlign: 'center', minWidth: 70, flexShrink: 0 }}>
                <div style={{ color: s.color, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, background: 'none', border: 'none',
                borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
                color: tab === t.id ? C.accent : C.muted,
                padding: '10px 4px', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'all 0.15s'
              }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>
        {tab === 'daily' && <DailyLog   {...tabProps} />}
        {tab === 'history' && <History    {...tabProps} />}
        {tab === 'pre'   && <PreTrade    {...tabProps} isCooldown={isCooldown} weekStopped={weekStopped} weekSetups={weekSetups} />}
        {tab === 'post'  && <PostTrade   {...tabProps} />}
        {tab === 'week'  && <Weekly      {...tabProps} weekTrades={weekTrades} weekPips={weekPips} weekSetups={weekSetups} />}
        {tab === 'perf'  && <Performance {...tabProps} />}
        {tab === 'rules' && <Rules       {...tabProps} />}
      </div>
    </div>
  );
}
