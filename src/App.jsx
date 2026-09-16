import { useState, useEffect, useCallback } from 'react';
import { C } from './theme';
import { loadData, saveData, loadLocal } from './storage';
import { Toast } from './components/UI';
import PreTrade    from './components/PreTrade';
import PostTrade   from './components/PostTrade';
import Weekly      from './components/Weekly';
import Performance from './components/Performance';
import Rules       from './components/Rules';
import DisciplineCalendar from './components/DisciplineCalendar';
import History     from './components/History';
import AIAnalysis  from './components/AIAnalysis';
import AnalysisTab from './AnalysisTab';
import RiskCalculator from './RiskCalculator';
import SettingsScreen from './SettingsScreen';

const TABS = [
  { id: 'pre',      icon: '📋', label: 'לפני' },
  { id: 'post',     icon: '📝', label: 'אחרי' },
  { id: 'daily',    icon: '🎯', label: 'משמעת' },
  { id: 'week',     icon: '📅', label: 'שבועי' },
  { id: 'perf',     icon: '📊', label: 'ביצועים' },
  { id: 'analysis', icon: '📈', label: 'ניתוח' },
  { id: 'ai',       icon: '🤖', label: 'AI Coach' },
  { id: 'history',  icon: '🗂', label: 'היסטוריה' },
  { id: 'rules',    icon: '🚨', label: 'חוקים' },
  { id: 'settings', icon: '⚙️', label: 'הגדרות' },
];

const DEFAULT_SETTINGS = {
  riskPct: 1,
  usdjpy: 155,
  commissionPerLot: 7,
  defaultPair: 'GBPJPY',
};

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
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const local = loadLocal();
    if (local) setData(local);
    setSyncing(true);
    loadData().then(d => {
      setData(d);
      setSyncing(false);
    });
  }, []);

  const save = useCallback((newData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ---- חשבון והגדרות: נשמרים בתוך אותו data ----
  const saveSettings = useCallback((s) => {
    save({ ...data, settings: s });
  }, [data, save]);

  const addEvent = useCallback((ev) => {
    const events = [...(data.accountEvents || []), { ...ev, id: ev.id || Date.now() }];
    save({ ...data, accountEvents: events });
    showToast('נרשם בחשבון');
  }, [data, save, showToast]);

  const deleteEvent = useCallback((id) => {
    save({ ...data, accountEvents: (data.accountEvents || []).filter(e => e.id !== id) });
  }, [data, save]);

  const applyRisk = useCallback((payload) => {
    save({ ...data, pendingTrade: payload });
    showToast(`${payload.lots} לוט · סיכון $${payload.riskUsd}`);
  }, [data, save, showToast]);

  if (!data) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontSize: 20, fontFamily: 'serif', direction: 'rtl' }}>
        טוען...
      </div>
    );
  }

  const events = data.accountEvents || [];
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };

  // Computed stats
  const weekStart = getWeekStart();
  const weekTrades = data.trades.filter(t => new Date(t.date) >= weekStart);
  const weekPips   = weekTrades.reduce((s, t) => s + (t.pips || 0), 0);
  const weekStopped = weekPips >= 100;

  const todayStr = new Date().toISOString().slice(0, 10);
  const dayTrades = data.trades.filter(t => t.date === todayStr);
  const weekSetups = weekTrades.length;
  const daySetups = dayTrades.length + (data.openTrades || []).filter(t => t.date === todayStr).length;

  const isCooldown = !!(data.cooldownUntil && new Date() < new Date(data.cooldownUntil));

  const totalTrades = data.trades.length;
  const wins = data.trades.filter(t => t.result === 'win').length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const allPips = data.trades.reduce((s, t) => s + (t.pips || 0), 0);
  const scored = data.trades.filter(t => typeof t.disciplineScore === 'number');
  const avgDisc = scored.length > 0
    ? (scored.reduce((s, t) => s + t.disciplineScore, 0) / scored.length).toFixed(1)
    : '—';

  // Daily streak
  const dailyLogs = data.dailyLogs || [];
  let streak = 0;
  const sortedLogs = [...dailyLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const log of sortedLogs) { if ((log.disciplineScore || 0) >= 6) streak++; else break; }

  const tabProps = { data, save, showToast };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', direction: 'rtl', fontFamily: "'Noto Serif Hebrew', serif", color: C.text, paddingBottom: 80 }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, #0d0d1a 0%, ${C.bg} 100%)`, borderBottom: `1px solid ${C.border}`, padding: '20px 16px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ color: C.accent, fontSize: 10, letterSpacing: 3, fontWeight: 700, marginBottom: 3 }}>מסחר • משמעת • 30 יום</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>יומן המשמעת</h1>
              {syncing && <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>מסנכרן...</div>}
            </div>
            <div>
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
              { label: 'Streak 🔥', value: streak > 0 ? `${streak}d` : '—', color: streak >= 5 ? C.green : C.text },
              { label: '🎯 משמעת', value: avgDisc, color: C.accent },
              { label: 'סה״כ פיפס', value: allPips >= 0 ? `${allPips.toFixed(0)}+` : allPips.toFixed(0), color: allPips >= 0 ? C.green : C.red },
              { label: '%Win', value: `${winRate}%`, color: C.blue },
              { label: 'Setups היום', value: `${daySetups}/2`, color: daySetups >= 2 ? C.red : C.text },
              { label: 'פיפס שבוע', value: `${weekPips.toFixed(0)}/100`, color: weekStopped ? C.red : weekPips > 60 ? C.warn : C.green },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', textAlign: 'center', minWidth: 70, flexShrink: 0 }}>
                <div style={{ color: s.color, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flexShrink: 0,
                background: 'none', border: 'none',
                borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
                color: tab === t.id ? C.accent : C.muted,
                padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11, fontWeight: tab === t.id ? 700 : 400,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'all 0.15s', whiteSpace: 'nowrap'
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
        {tab === 'pre' && (
          <>
            <RiskCalculator
              theme={C}
              trades={data.trades}
              events={events}
              settings={settings}
              onOpenSettings={() => setTab('settings')}
              onApply={applyRisk}
            />
            <div style={{ height: 20 }} />
            <PreTrade {...tabProps} isCooldown={isCooldown} weekStopped={weekStopped} weekSetups={weekSetups} daySetups={daySetups} />
          </>
        )}
        {tab === 'post'    && <PostTrade   {...tabProps} />}
        {tab === 'daily'   && <DisciplineCalendar {...tabProps} />}
        {tab === 'week'    && <Weekly      {...tabProps} weekTrades={weekTrades} weekPips={weekPips} weekSetups={weekSetups} />}
        {tab === 'perf'    && <Performance {...tabProps} />}
        {tab === 'analysis' && (
          <AnalysisTab theme={C} trades={data.trades} events={events} settings={settings} />
        )}
        {tab === 'ai'      && <AIAnalysis  {...tabProps} />}
        {tab === 'history' && <History     {...tabProps} />}
        {tab === 'rules'   && <Rules       {...tabProps} />}
        {tab === 'settings' && (
          <SettingsScreen
            theme={C}
            trades={data.trades}
            events={events}
            settings={settings}
            onSettingsChange={saveSettings}
            onAddEvent={addEvent}
            onDeleteEvent={deleteEvent}
            data={data}
            save={save}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}
