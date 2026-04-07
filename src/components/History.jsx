import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle } from './UI';

function TradeDetail({ trade, onClose }) {
  const screenshots = (trade.screenshots || []).filter(s => s && s.startsWith('http'));
  const scoreColor = (s) => s >= 7 ? C.green : s >= 5 ? C.warn : C.red;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 999, overflowY: 'auto', padding: '20px 16px'
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: C.accent, fontSize: 11, letterSpacing: 2 }}>עסקה</div>
            <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{trade.pair} — {trade.date}</div>
          </div>
          <button onClick={onClose} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.muted, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14
          }}>✕ סגור</button>
        </div>

        {/* Result summary */}
        <Card style={{ background: trade.result === 'win' ? '#081a08' : trade.result === 'loss' ? '#1a0808' : C.card, borderColor: trade.result === 'win' ? C.green + '44' : trade.result === 'loss' ? C.red + '44' : C.border }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
            <div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>תוצאה</div>
              <div style={{ color: trade.result === 'win' ? C.green : trade.result === 'loss' ? C.red : C.muted, fontSize: 18, fontWeight: 700 }}>
                {trade.result === 'win' ? '🟢 רווח' : trade.result === 'loss' ? '🔴 הפסד' : '⚪ BE'}
              </div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>פיפס</div>
              <div style={{ color: trade.pips > 0 ? C.green : trade.pips < 0 ? C.red : C.muted, fontSize: 22, fontWeight: 700 }}>
                {trade.pips > 0 ? '+' : ''}{trade.pips}
              </div>
            </div>
            <div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>כיוון</div>
              <div style={{ color: trade.direction === 'long' ? C.green : C.red, fontSize: 18, fontWeight: 700 }}>
                {trade.direction === 'long' ? '🟢 Long' : '🔴 Short'}
              </div>
            </div>
          </div>
          {(trade.entry || trade.sl || trade.tp) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              {[['Entry', trade.entry], ['Stop Loss', trade.sl], ['Take Profit', trade.tp]].map(([l, v]) => v ? (
                <div key={l}>
                  <div style={{ color: C.muted, fontSize: 10 }}>{l}</div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ) : null)}
            </div>
          )}
        </Card>

        {/* Scores */}
        <Card>
          <SectionTitle>ציונים</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, textAlign: 'center' }}>
            {[['משמעת', trade.disciplineScore], ['סבלנות', trade.patienceScore], ['רגש', trade.emotionScore]].map(([l, v]) => (
              <div key={l} style={{ background: C.card2, borderRadius: 9, padding: '10px 6px' }}>
                <div style={{ color: scoreColor(v), fontSize: 22, fontWeight: 700 }}>{v}<span style={{ fontSize: 12, color: C.muted }}>/10</span></div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Execution */}
        <Card>
          <SectionTitle>ביצוע</SectionTitle>
          {[
            ['סגר לפי התוכנית', trade.closedByPlan, false],
            ['כיבד 2R', trade.respected2R, false],
            ['ניסה Home Run', trade.triedHomeRun, true],
            ['שינה מרגש', trade.changedFromEmotion, true],
            ['ניסה להחזיר', trade.triedToRecover, true],
            ['חריגה מהחוקים', trade.violatedRule, true],
          ].map(([label, val, isDanger]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.muted }}>{label}</span>
              <span style={{ color: val ? (isDanger ? C.red : C.green) : (isDanger ? C.green : C.red), fontWeight: 600 }}>
                {val ? (isDanger ? '❌ כן' : '✅ כן') : (isDanger ? '✅ לא' : '❌ לא')}
              </span>
            </div>
          ))}
        </Card>

        {/* Mental analysis */}
        {(trade.whyEntered || trade.feltBefore || trade.feltDuring || trade.mentalMistake || trade.whatGood || trade.whatFix) && (
          <Card>
            <SectionTitle>ניתוח מנטלי</SectionTitle>
            {[
              ['למה נכנסתי', trade.whyEntered],
              ['הרגשתי לפני', trade.feltBefore],
              ['הרגשתי בזמן', trade.feltDuring],
              ['טעות מנטלית', trade.mentalMistake],
              ['מה עשיתי טוב', trade.whatGood],
              ['מה אני מתקן', trade.whatFix],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>
                <div style={{ color: C.text, fontSize: 14, lineHeight: 1.6, background: C.card2, padding: '10px 12px', borderRadius: 8 }}>{val}</div>
              </div>
            ))}
          </Card>
        )}

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <Card>
            <SectionTitle>📸 Screenshots</SectionTitle>
            {screenshots.map((url, i) => {
              const labels = ['Entry', 'Exit', 'Multi-TF'];
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>{labels[i] || `תמונה ${i+1}`}</div>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 9, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                    <img src={url} alt={labels[i]} style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                    />
                    <div style={{ display: 'none', alignItems: 'center', gap: 10, padding: '12px 14px', background: C.card2, color: C.accent, fontSize: 13 }}>
                      <span>📷</span><span>פתח בטלגרם ↗</span>
                    </div>
                  </a>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}

function DailyDetail({ log, onClose }) {
  const SETUP_LABELS = { took: '✅ לקחתי', missed: '⏱ פיספסתי', invalid: '❌ לא עמד', none: '— לא היה' };
  const SETUP_COLORS = { took: C.green, missed: C.warn, invalid: C.red, none: C.muted };
  const MARKET_LABELS = { trending: '📈 Trending', ranging: '↔️ Ranging', volatile: '⚡ Volatile' };
  const dc = (log.disciplineScore || 0) >= 7 ? C.green : (log.disciplineScore || 0) >= 5 ? C.warn : C.red;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: C.accent, fontSize: 11, letterSpacing: 2 }}>יומן יומי</div>
            <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{log.date}</div>
          </div>
          <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>✕ סגור</button>
        </div>

        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ background: C.card2, borderRadius: 9, padding: 12, textAlign: 'center' }}>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Setup</div>
              <div style={{ color: SETUP_COLORS[log.sawSetup] || C.muted, fontSize: 15, fontWeight: 600 }}>{SETUP_LABELS[log.sawSetup] || '—'}</div>
            </div>
            <div style={{ background: C.card2, borderRadius: 9, padding: 12, textAlign: 'center' }}>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>ציון משמעת</div>
              <div style={{ color: dc, fontSize: 22, fontWeight: 700 }}>{log.disciplineScore}<span style={{ fontSize: 12, color: C.muted }}>/10</span></div>
            </div>
          </div>
          {log.marketCondition && (
            <div style={{ padding: '8px 12px', background: C.card2, borderRadius: 8, color: C.muted, fontSize: 13, marginBottom: 10 }}>
              שוק: <span style={{ color: C.text }}>{MARKET_LABELS[log.marketCondition] || log.marketCondition}</span>
            </div>
          )}
          {log.missedReason && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>סיבה</div>
              <div style={{ color: C.text, fontSize: 14, background: C.card2, padding: '10px 12px', borderRadius: 8 }}>{log.missedReason}</div>
            </div>
          )}
          {log.dayNote && (
            <div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>הערה על היום</div>
              <div style={{ color: C.text, fontSize: 14, fontStyle: 'italic', background: C.card2, padding: '10px 12px', borderRadius: 8 }}>"{log.dayNote}"</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function History({ data }) {
  const openTrades = data.openTrades || [];
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const trades = data.trades || [];
  const dailyLogs = data.dailyLogs || [];

  // Merge and sort all entries by date
  const allEntries = [
    ...trades.map(t => ({ ...t, _type: 'trade' })),
    ...dailyLogs.map(l => ({ ...l, _type: 'daily' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = allEntries.filter(e => {
    if (filter === 'trades') return e._type === 'trade';
    if (filter === 'daily') return e._type === 'daily';
    return true;
  });

  const openEntry = (entry) => {
    setSelected(entry);
    setSelectedType(entry._type);
  };

  return (
    <div>
      {selected && selectedType === 'trade' && (
        <TradeDetail trade={selected} onClose={() => setSelected(null)} />
      )}
      {selected && selectedType === 'daily' && (
        <DailyDetail log={selected} onClose={() => setSelected(null)} />
      )}

      {/* Open trades */}
      {openTrades.length > 0 && (
        <Card style={{ background: '#0d1a0d', borderColor: C.green + '44', marginBottom: 16 }}>
          <SectionTitle>🟢 עסקאות פתוחות ({openTrades.length})</SectionTitle>
          {openTrades.map(t => (
            <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{t.pair}</span>
                  <span style={{ color: t.direction === 'long' ? C.green : C.red, fontSize: 12, marginRight: 8 }}>
                    {t.direction === 'long' ? ' ▲ Long' : ' ▼ Short'}
                  </span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{t.date} {t.time}</span>
                </div>
                <div style={{ background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 20, padding: '3px 10px', color: C.green, fontSize: 11, fontWeight: 600 }}>
                  פתוחה
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: C.muted }}>
                <span>Entry: <span style={{ color: C.text }}>{t.entry || '—'}</span></span>
                <span>SL: <span style={{ color: C.red }}>{t.sl || '—'}</span></span>
                <span>TP: <span style={{ color: C.green }}>{t.tp || '—'}</span></span>
                <span>Setup #{t.setupNum}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['all', 'הכל'], ['trades', 'עסקאות בלבד'], ['daily', 'יומי בלבד']].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9,
            border: `1px solid ${filter === v ? C.accent : C.border}`,
            background: filter === v ? C.accent + '18' : 'transparent',
            color: filter === v ? C.accent : C.muted,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            transition: 'all 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {/* Summary stats */}
      {trades.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'עסקאות', value: trades.length, color: C.text },
            { label: 'רווח/הפסד', value: `${trades.reduce((s, t) => s + (t.pips || 0), 0).toFixed(0)}p`, color: trades.reduce((s, t) => s + (t.pips || 0), 0) >= 0 ? C.green : C.red },
            { label: 'Win Rate', value: `${trades.length ? Math.round((trades.filter(t => t.result === 'win').length / trades.length) * 100) : 0}%`, color: C.blue },
          ].map(s => (
            <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ color: s.color, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Entries list */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ color: C.muted, fontSize: 15 }}>אין רשומות עדיין</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>הוסף עסקאות בטאב "אחרי" או רשומות יומיות בטאב "יומי"</div>
        </Card>
      ) : (
        <div>
          {filtered.map((entry, i) => {
            if (entry._type === 'trade') {
              const dc = (entry.disciplineScore || 0) >= 7 ? C.green : (entry.disciplineScore || 0) >= 5 ? C.warn : C.red;
              return (
                <div key={entry.id || i} onClick={() => openEntry(entry)} style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + '55'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>{entry.pair}</span>
                        <span style={{ color: C.muted, fontSize: 12 }}>{entry.date}</span>
                        {entry.violatedRule && <span style={{ color: C.red, fontSize: 10, background: C.red + '22', padding: '2px 6px', borderRadius: 10 }}>⚠️ חריגה</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: entry.direction === 'long' ? C.green : C.red }}>
                          {entry.direction === 'long' ? '▲ Long' : '▼ Short'}
                        </span>
                        <span style={{ color: C.muted, fontSize: 11 }}>Setup #{entry.setupNum}</span>
                        <span style={{ color: dc, fontSize: 12 }}>🎯 {entry.disciplineScore}/10</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: entry.pips > 0 ? C.green : entry.pips < 0 ? C.red : C.muted, fontSize: 22, fontWeight: 700 }}>
                        {entry.pips > 0 ? '+' : ''}{entry.pips}p
                      </div>
                      <div style={{ color: C.muted, fontSize: 10, textAlign: 'center' }}>
                        {entry.result === 'win' ? '🟢' : entry.result === 'loss' ? '🔴' : '⚪'}
                      </div>
                    </div>
                  </div>
                  {entry.dayNote && (
                    <div style={{ color: C.muted, fontSize: 12, fontStyle: 'italic', marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      "{entry.whatGood || entry.whatFix || ''}"
                    </div>
                  )}
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 6, textAlign: 'left' }}>לחץ לפרטים ←</div>
                </div>
              );
            } else {
              // Daily log
              const SETUP_COLORS = { took: C.green, missed: C.warn, invalid: C.red, none: C.muted };
              const SETUP_LABELS = { took: '✅ לקחתי', missed: '⏱ פיספסתי', invalid: '❌ לא עמד', none: '— לא היה כלום' };
              const dc = (entry.disciplineScore || 0) >= 7 ? C.green : (entry.disciplineScore || 0) >= 5 ? C.warn : C.red;
              return (
                <div key={entry.id || i} onClick={() => openEntry(entry)} style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
                  transition: 'border-color 0.15s', borderRight: `3px solid ${C.blue}44`
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.blue + '55'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, background: C.blue + '22', color: C.blue, padding: '2px 8px', borderRadius: 10 }}>📓 יומי</span>
                        <span style={{ color: C.muted, fontSize: 12 }}>{entry.date}</span>
                      </div>
                      <span style={{ color: SETUP_COLORS[entry.sawSetup] || C.muted, fontSize: 13, fontWeight: 600 }}>
                        {SETUP_LABELS[entry.sawSetup] || '—'}
                      </span>
                      {entry.dayNote && (
                        <div style={{ color: C.muted, fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>"{entry.dayNote}"</div>
                      )}
                    </div>
                    <div style={{ color: dc, fontSize: 20, fontWeight: 700 }}>
                      {entry.disciplineScore}<span style={{ fontSize: 11, color: C.muted }}>/10</span>
                    </div>
                  </div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 8, textAlign: 'left' }}>לחץ לפרטים ←</div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
