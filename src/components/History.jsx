import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Input, Textarea, ScoreSlider, SegmentedControl } from './UI';

// ── Edit Trade Modal ──────────────────────────────────────────
function EditTradeModal({ trade, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...trade });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: C.accent, fontSize: 11, letterSpacing: 2 }}>עריכת עסקה</div>
            <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{form.pair} — {form.date}</div>
          </div>
          <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>✕ סגור</button>
        </div>

        <Card>
          <SectionTitle>פרטי עסקה</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="תאריך" type="date" value={form.date} onChange={v => set('date', v)} />
            <div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 5 }}>צמד</div>
              <select value={form.pair} onChange={e => set('pair', e.target.value)} style={{ width: '100%', background: '#0d0d16', border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 13px', color: C.text, fontSize: 14, fontFamily: 'inherit' }}>
                {['GBPJPY','EURUSD','GBPUSD','USDJPY','XAUUSD','EURJPY','אחר'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 7 }}>תוצאה</div>
            <SegmentedControl value={form.result} onChange={v => set('result', v)} options={[
              { value: 'win', label: '🟢 רווח', color: C.green },
              { value: 'loss', label: '🔴 הפסד', color: C.red },
              { value: 'be', label: '⚪ BE', color: C.muted },
            ]} />
          </div>
          <Input label="פיפס" type="number" value={String(form.pips)} onChange={v => set('pips', parseFloat(v) || 0)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 7 }}>כיוון</div>
              <SegmentedControl value={form.direction} onChange={v => set('direction', v)} options={[
                { value: 'long', label: '🟢 Long', color: C.green },
                { value: 'short', label: '🔴 Short', color: C.red },
              ]} />
            </div>
            <Input label="Setup מס׳" value={form.setupNum || '1'} onChange={v => set('setupNum', v)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Input label="Entry" value={form.entry || ''} onChange={v => set('entry', v)} />
            <Input label="Stop Loss" value={form.sl || ''} onChange={v => set('sl', v)} />
            <Input label="Take Profit" value={form.tp || ''} onChange={v => set('tp', v)} />
          </div>
        </Card>

        <Card>
          <SectionTitle>ניתוח מנטלי</SectionTitle>
          <Textarea label="למה נכנסתי?" value={form.whyEntered || ''} onChange={v => set('whyEntered', v)} rows={2} />
          <Textarea label="הרגשתי לפני" value={form.feltBefore || ''} onChange={v => set('feltBefore', v)} rows={2} />
          <Textarea label="הרגשתי בזמן" value={form.feltDuring || ''} onChange={v => set('feltDuring', v)} rows={2} />
          <Textarea label="טעות מנטלית" value={form.mentalMistake || ''} onChange={v => set('mentalMistake', v)} rows={2} />
          <Textarea label="מה עשיתי טוב" value={form.whatGood || ''} onChange={v => set('whatGood', v)} rows={2} />
          <Textarea label="מה אני מתקן" value={form.whatFix || ''} onChange={v => set('whatFix', v)} rows={2} />
        </Card>

        <Card>
          <SectionTitle>ציונים</SectionTitle>
          <ScoreSlider label="משמעת" value={form.disciplineScore || 7} onChange={v => set('disciplineScore', v)} />
          <ScoreSlider label="סבלנות" value={form.patienceScore || 7} onChange={v => set('patienceScore', v)} />
          <ScoreSlider label="שליטה ברגש" value={form.emotionScore || 7} onChange={v => set('emotionScore', v)} />
        </Card>

        <Card>
          <SectionTitle>Screenshots</SectionTitle>
          {(form.screenshots || ['','','']).map((url, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>
                {['Entry','Exit','Multi-TF'][i]}
              </div>
              <input type="url" value={url} onChange={e => {
                const s = [...(form.screenshots || ['','',''])];
                s[i] = e.target.value;
                set('screenshots', s);
              }} placeholder="לינק מטלגרם..." style={{ width: '100%', background: '#0d0d16', border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 13px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            </div>
          ))}
        </Card>

        {/* Save button */}
        <button onClick={() => onSave(form)} style={{
          width: '100%', background: C.accent + '18', border: `1px solid ${C.accent}`,
          color: C.accent, padding: '14px', borderRadius: 9, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 16, fontWeight: 700, marginBottom: 10
        }}>💾 שמור שינויים</button>

        {/* Delete button */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{
            width: '100%', background: 'transparent', border: `1px solid ${C.red}44`,
            color: C.red, padding: '12px', borderRadius: 9, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 14, marginBottom: 20
          }}>🗑 מחק עסקה</button>
        ) : (
          <div style={{ background: '#1a0808', border: `1px solid ${C.red}`, borderRadius: 9, padding: '14px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ color: C.text, fontSize: 14, marginBottom: 12 }}>האם אתה בטוח? פעולה זו לא ניתנת לביטול.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>ביטול</button>
              <button onClick={() => onDelete(form.id)} style={{ flex: 1, background: C.red + '22', border: `1px solid ${C.red}`, color: C.red, padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>כן, מחק</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit Daily Log Modal ──────────────────────────────────────
function EditDailyModal({ log, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...log });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const SETUP_OPTIONS = [
    { value: 'took', label: '✅ לקחתי', color: C.green },
    { value: 'missed', label: '⏱ פיספסתי', color: C.warn },
    { value: 'invalid', label: '❌ לא עמד', color: C.red },
    { value: 'none', label: '— לא היה', color: C.muted },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ color: C.accent, fontSize: 11, letterSpacing: 2 }}>עריכת יומן יומי</div>
            <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{form.date}</div>
          </div>
          <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>✕ סגור</button>
        </div>

        <Card>
          <SectionTitle>פרטי היום</SectionTitle>
          <Input label="תאריך" type="date" value={form.date} onChange={v => set('date', v)} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 7 }}>מה קרה עם Setup?</div>
            <SegmentedControl value={form.sawSetup} onChange={v => set('sawSetup', v)} options={SETUP_OPTIONS} />
          </div>
          <Textarea label="סיבה / הערה על ה-Setup" value={form.missedReason || ''} onChange={v => set('missedReason', v)} rows={2} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 7 }}>מצב שוק</div>
            <SegmentedControl value={form.marketCondition || 'ranging'} onChange={v => set('marketCondition', v)} options={[
              { value: 'trending', label: '📈 Trending', color: C.green },
              { value: 'ranging', label: '↔️ Ranging', color: C.blue },
              { value: 'volatile', label: '⚡ Volatile', color: C.red },
            ]} />
          </div>
          <Textarea label="משפט על היום" value={form.dayNote || ''} onChange={v => set('dayNote', v)} rows={2} />
          <ScoreSlider label="ציון משמעת יומי" value={form.disciplineScore || 7} onChange={v => set('disciplineScore', v)} />
        </Card>

        <button onClick={() => onSave(form)} style={{
          width: '100%', background: C.accent + '18', border: `1px solid ${C.accent}`,
          color: C.accent, padding: '14px', borderRadius: 9, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 16, fontWeight: 700, marginBottom: 10
        }}>💾 שמור שינויים</button>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{
            width: '100%', background: 'transparent', border: `1px solid ${C.red}44`,
            color: C.red, padding: '12px', borderRadius: 9, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 14, marginBottom: 20
          }}>🗑 מחק רשומה</button>
        ) : (
          <div style={{ background: '#1a0808', border: `1px solid ${C.red}`, borderRadius: 9, padding: '14px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ color: C.text, fontSize: 14, marginBottom: 12 }}>האם אתה בטוח? פעולה זו לא ניתנת לביטול.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>ביטול</button>
              <button onClick={() => onDelete(form.id)} style={{ flex: 1, background: C.red + '22', border: `1px solid ${C.red}`, color: C.red, padding: '10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>כן, מחק</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main History Component ────────────────────────────────────
export default function History({ data, save, showToast }) {
  const openTrades = data.openTrades || [];
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [editingType, setEditingType] = useState(null);

  const trades = data.trades || [];
  const dailyLogs = data.dailyLogs || [];

  const allEntries = [
    ...trades.map(t => ({ ...t, _type: 'trade' })),
    ...dailyLogs.map(l => ({ ...l, _type: 'daily' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = allEntries.filter(e => {
    if (filter === 'trades') return e._type === 'trade';
    if (filter === 'daily') return e._type === 'daily';
    return true;
  });

  const handleSaveTrade = (updated) => {
    const newTrades = trades.map(t => t.id === updated.id ? updated : t);
    save({ ...data, trades: newTrades });
    setEditing(null);
    showToast('✓ עסקה עודכנה!');
  };

  const handleDeleteTrade = (id) => {
    const newTrades = trades.filter(t => t.id !== id);
    save({ ...data, trades: newTrades });
    setEditing(null);
    showToast('✓ עסקה נמחקה');
  };

  const handleSaveDaily = (updated) => {
    const newLogs = dailyLogs.map(l => l.id === updated.id ? updated : l);
    save({ ...data, dailyLogs: newLogs });
    setEditing(null);
    showToast('✓ רשומה עודכנה!');
  };

  const handleDeleteDaily = (id) => {
    const newLogs = dailyLogs.filter(l => l.id !== id);
    save({ ...data, dailyLogs: newLogs });
    setEditing(null);
    showToast('✓ רשומה נמחקה');
  };

  return (
    <div>
      {/* Edit modals */}
      {editing && editingType === 'trade' && (
        <EditTradeModal
          trade={editing}
          onSave={handleSaveTrade}
          onDelete={handleDeleteTrade}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && editingType === 'daily' && (
        <EditDailyModal
          log={editing}
          onSave={handleSaveDaily}
          onDelete={handleDeleteDaily}
          onClose={() => setEditing(null)}
        />
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
                <div style={{ background: C.green + '22', border: `1px solid ${C.green}44`, borderRadius: 20, padding: '3px 10px', color: C.green, fontSize: 11, fontWeight: 600 }}>פתוחה</div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: C.muted }}>
                <span>Entry: <span style={{ color: C.text }}>{t.entry || '—'}</span></span>
                <span>SL: <span style={{ color: C.red }}>{t.sl || '—'}</span></span>
                <span>TP: <span style={{ color: C.green }}>{t.tp || '—'}</span></span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['all', 'הכל'], ['trades', 'עסקאות'], ['daily', 'יומי']].map(([v, label]) => (
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
            { label: 'סה״כ פיפס', value: `${trades.reduce((s, t) => s + (t.pips || 0), 0).toFixed(0)}p`, color: trades.reduce((s, t) => s + (t.pips || 0), 0) >= 0 ? C.green : C.red },
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
        </Card>
      ) : (
        <div>
          {filtered.map((entry, i) => {
            if (entry._type === 'trade') {
              const dc = (entry.disciplineScore || 0) >= 7 ? C.green : (entry.disciplineScore || 0) >= 5 ? C.warn : C.red;
              return (
                <div key={entry.id || i} style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '14px 16px', marginBottom: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
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
                      {(entry.screenshots || []).filter(s => s && s.startsWith('http')).length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {(entry.screenshots || []).filter(s => s && s.startsWith('http')).map((url, si) => (
                            <a key={si} href={url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ background: C.blue + '22', border: `1px solid ${C.blue}44`, borderRadius: 6, padding: '3px 10px', color: C.blue, fontSize: 11, textDecoration: 'none' }}>
                              📸 {['Entry', 'Exit', 'Multi-TF'][si] || `תמונה ${si + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'left', marginRight: 12 }}>
                      <div style={{ color: entry.pips > 0 ? C.green : entry.pips < 0 ? C.red : C.muted, fontSize: 22, fontWeight: 700 }}>
                        {entry.pips > 0 ? '+' : ''}{entry.pips}p
                      </div>
                      <div style={{ color: C.muted, fontSize: 10, textAlign: 'center' }}>
                        {entry.result === 'win' ? '🟢' : entry.result === 'loss' ? '🔴' : '⚪'}
                      </div>
                    </div>
                  </div>
                  {/* Edit button */}
                  <button onClick={() => { setEditing(entry); setEditingType('trade'); }} style={{
                    marginTop: 10, width: '100%', background: 'transparent',
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.muted, padding: '8px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, transition: 'all 0.15s'
                  }}
                    onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                    onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
                  >✏️ ערוך / מחק</button>
                </div>
              );
            } else {
              const SETUP_COLORS = { took: C.green, missed: C.warn, invalid: C.red, none: C.muted };
              const SETUP_LABELS = { took: '✅ לקחתי', missed: '⏱ פיספסתי', invalid: '❌ לא עמד', none: '— לא היה' };
              const dc = (entry.disciplineScore || 0) >= 7 ? C.green : (entry.disciplineScore || 0) >= 5 ? C.warn : C.red;
              return (
                <div key={entry.id || i} style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '14px 16px', marginBottom: 10, borderRight: `3px solid ${C.blue}44`
                }}>
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
                  <button onClick={() => { setEditing(entry); setEditingType('daily'); }} style={{
                    marginTop: 10, width: '100%', background: 'transparent',
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.muted, padding: '8px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, transition: 'all 0.15s'
                  }}
                    onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
                    onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
                  >✏️ ערוך / מחק</button>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
