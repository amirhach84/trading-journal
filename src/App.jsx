import { useState, useEffect, useCallback } from 'react';
import { C } from './theme';
import { loadData, saveData, loadLocal } from './storage';
import { Toast } from './components/UI';
import Dashboard   from './components/Dashboard';
import PreTrade    from './components/PreTrade';
import PostTrade   from './components/PostTrade';
import Weekly      from './components/Weekly';
import Performance from './components/Performance';
import Rules       from './components/Rules';
import DisciplineCalendar from './components/DisciplineCalendar';
import History     from './components/History';
import AnalysisTab from './AnalysisTab';
import RiskCalculator from './RiskCalculator';
import SettingsScreen from './SettingsScreen';
import { weekStatus, rContext, fmtR } from './rMultiple';
import AccountSwitcher from './components/AccountSwitcher';
import {
  scopeData, unscopeData, accountsOf, activeIdOf, activeAccountOf,
  propStatus,
} from './accounts';
import { netOf } from './accountBalance';

const TABS = [
  { id: 'dash',     icon: '📊', label: 'דאשבורד' },
  { id: 'pre',      icon: '📋', label: 'לפני' },
  { id: 'post',     icon: '📝', label: 'אחרי' },
  { id: 'daily',    icon: '🎯', label: 'משמעת' },
  { id: 'week',     icon: '📅', label: 'שבועי' },
  { id: 'perf',     icon: '📊', label: 'ביצועים' },
  { id: 'analysis', icon: '📈', label: 'ניתוח' },
  { id: 'history',  icon: '🗂', label: 'היסטוריה' },
  { id: 'rules',    icon: '🚨', label: 'חוקים' },
  { id: 'settings', icon: '⚙️', label: 'הגדרות' },
];

const DEFAULT_SETTINGS = {
  losingDayStreak: 3,
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
  const [tab, setTab] = useState('dash');
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
    const id = activeIdOf(data);
    const events = [...(data.accountEvents || []),
      { ...ev, id: ev.id || Date.now(), accountId: id }];
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

  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };

  // ---- תחימה לחשבון הפעיל ----
  // המסכים מקבלים נתונים של חשבון אחד בלבד, ולא יודעים על חשבונות.
  const accounts = accountsOf(data);
  const activeId = activeIdOf(data);
  const account = activeAccountOf(data);
  const view = scopeData(data, activeId);
  const events = view.accountEvents || [];

  const saveScoped = (next) => save(unscopeData(data, next, activeId));

  const prop = account.kind === 'prop'
    ? propStatus(account, view.trades, (t) => netOf(t, settings))
    : null;
  const propBlocked = !!(prop && prop.blocked);

  // Computed stats
  const weekStart = getWeekStart();
  const weekTrades = view.trades.filter(t => new Date(t.date) >= weekStart);
  const weekPips   = weekTrades.reduce((s, t) => s + (t.pips || 0), 0);

  // חוקי השבוע: מקסימום 5 עסקאות, עצירה ב-3 הפסדים
  const R = rContext(view.trades);
  const wk = weekStatus(view, settings);
  const weekStopped = wk.stopped;
  const cov = R.coverage(view.trades);
  const totalR = cov.r;

  const todayStr = new Date().toISOString().slice(0, 10);
  const dayTrades = view.trades.filter(t => t.date === todayStr);
  const weekSetups = weekTrades.length;
  const daySetups = dayTrades.length + (view.openTrades || []).filter(t => t.date === todayStr).length;

  const isCooldown = !!(data.cooldownUntil && new Date() < new Date(data.cooldownUntil));

  const totalTrades = view.trades.length;
  const wins = view.trades.filter(t => t.result === 'win').length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const scored = view.trades.filter(t => typeof t.disciplineScore === 'number');
  const avgDisc = scored.length > 0
    ? (scored.reduce((s, t) => s + t.disciplineScore, 0) / scored.length).toFixed(1)
    : '—';

  // Daily streak
  const dailyLogs = data.dailyLogs || [];
  let streak = 0;
  const sortedLogs = [...dailyLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const log of sortedLogs) { if ((log.disciplineScore || 0) >= 6) streak++; else break; }

  const tabProps = { data: view, save: saveScoped, showToast };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', direction: 'rtl', fontFamily: "'Noto Serif Hebrew', serif", color: C.text, paddingBottom: 80 }}>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, #0d0d1a 0%, ${C.bg} 100%)`, borderBottom: `1px solid ${C.border}`, padding: '20px 16px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div dir="ltr" style={{ textAlign: 'right' }}>
              <div style={{
                color: C.accent, fontSize: 9, fontWeight: 600,
                letterSpacing: '0.46em', marginBottom: 1, opacity: 0.75,
                fontFamily: "-apple-system, 'SF Pro Display', system-ui, 'Segoe UI', sans-serif",
              }}>
                TRADING
              </div>
              <h1 style={{
                margin: 0,
                fontSize: 'clamp(26px, 8vw, 34px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 0.95,
                fontFamily: "-apple-system, 'SF Pro Display', system-ui, 'Segoe UI', sans-serif",
                background: `linear-gradient(120deg, ${C.accentDim} 0%, ${C.accent} 38%, #f3e3ba 62%, ${C.accent} 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: C.accent,
              }}>
                JOURNAL
              </h1>
              <div style={{
                height: 2, width: 46, marginTop: 7, borderRadius: 2,
                background: `linear-gradient(90deg, ${C.accent}, transparent)`,
              }} />
              {syncing && (
                <div dir="rtl" style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>מסנכרן...</div>
              )}
            </div>
            <div>
              {propBlocked && (
                <div style={{ background: C.red + '22', border: `1px solid ${C.red}66`, borderRadius: 8, padding: '5px 10px', color: C.red, fontSize: 11, fontWeight: 700 }}>
                  🚫 חוק חשבון הופר
                </div>
              )}
              {isCooldown && !propBlocked && (
                <div style={{ background: C.red + '22', border: `1px solid ${C.red}44`, borderRadius: 8, padding: '5px 10px', color: C.red, fontSize: 11, fontWeight: 700 }}>
                  🚫 עצירת 48ש׳
                </div>
              )}
              {weekStopped && !isCooldown && (
                <div style={{ background: C.red + '22', border: `1px solid ${C.red}44`, borderRadius: 8, padding: '5px 10px', color: C.red, fontSize: 11, fontWeight: 700 }}>
                  🚫 שבוע נסגר
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              { label: 'Streak 🔥', value: streak > 0 ? `${streak}d` : '—', color: streak >= 5 ? C.green : C.text },
              { label: '🎯 משמעת', value: avgDisc, color: C.accent },
              { label: 'סה״כ פיפס', value: `${cov.pips > 0 ? '+' : ''}${cov.pips.toFixed(0)}`,
                color: cov.pips >= 0 ? C.green : C.red },
              { label: 'סה״כ R', value: cov.withR ? fmtR(totalR, 1) : '—',
                color: totalR >= 0 ? C.green : C.red },
              { label: 'R שבוע', value: fmtR(wk.totalR, 1, wk.estimated > 0), color: wk.totalR >= 0 ? C.green : C.red },
              { label: '%Win', value: `${winRate}%`, color: C.blue },
              { label: 'Setups היום', value: `${daySetups}/2`, color: daySetups >= 2 ? C.red : C.text },
              { label: 'עסקאות שבוע', value: wk.used, color: C.text },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', textAlign: 'center', minWidth: 70, flexShrink: 0 }}>
                <div style={{ color: s.color, fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* בורר חשבון */}
          {(accounts.length > 1 || account.kind === 'prop') && (
            <div style={{ marginBottom: 12 }}>
              <AccountSwitcher data={data} save={save} showToast={showToast} compact />
            </div>
          )}

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
        {tab === 'dash' && <Dashboard data={view} settings={settings} />}
        {tab === 'pre' && (
          <>
            <RiskCalculator
              theme={C}
              trades={view.trades}
              events={events}
              settings={{ ...settings, riskPct: account.riskPct ?? settings.riskPct }}
              onOpenSettings={() => setTab('settings')}
              onApply={applyRisk}
            />
            <div style={{ height: 20 }} />
            <PreTrade {...tabProps} isCooldown={isCooldown || propBlocked} weekStopped={weekStopped} weekSetups={weekSetups} daySetups={daySetups} />
          </>
        )}
        {tab === 'post'    && <PostTrade   {...tabProps} />}
        {tab === 'daily'   && <DisciplineCalendar {...tabProps} />}
        {tab === 'week'    && <Weekly      {...tabProps} weekTrades={weekTrades} weekPips={weekPips} weekSetups={weekSetups} />}
        {tab === 'perf'    && <Performance {...tabProps} />}
        {tab === 'analysis' && (
          <AnalysisTab theme={C} trades={view.trades} events={events} settings={settings} />
        )}
        {tab === 'history' && <History     {...tabProps} />}
        {tab === 'rules'   && <Rules       {...tabProps} />}
        {tab === 'settings' && (
          <>
            <AccountSwitcher data={data} save={save} showToast={showToast} />
            <SettingsScreen
              theme={C}
              trades={view.trades}
              events={events}
              settings={settings}
              onSettingsChange={saveSettings}
              onAddEvent={addEvent}
              onDeleteEvent={deleteEvent}
              data={view}
              save={saveScoped}
              showToast={showToast}
            />
          </>
        )}
      </div>
    </div>
  );
}
