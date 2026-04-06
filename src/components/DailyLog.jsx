import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Textarea, Btn, ScoreSlider, SegmentedControl } from './UI';

const SETUP_OPTIONS = [
  { value: 'took', label: '✅ לקחתי', color: C.green },
  { value: 'missed', label: '⏱ פיספסתי', color: C.warn },
  { value: 'invalid', label: '❌ לא עמד', color: C.red },
  { value: 'none', label: '— לא היה', color: C.muted },
];

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  sawSetup: 'none',
  missedReason: '',
  dayNote: '',
  disciplineScore: 7,
  marketCondition: 'ranging',
  willTradeTomorrow: null,
});

export default function DailyLog({ data, save, showToast }) {
  const [form, setForm] = useState(emptyForm());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const log = { ...form, savedAt: new Date().toISOString(), id: Date.now() };
    save({ ...data, dailyLogs: [...(data.dailyLogs || []), log] });
    showToast('✓ יומן יומי נשמר!');
    setForm(emptyForm());
  };

  const recentLogs = [...(data.dailyLogs || [])].reverse().slice(0, 7);

  const disciplineColor = form.disciplineScore >= 7 ? C.green : form.disciplineScore >= 5 ? C.warn : C.red;

  // Streak calculation
  const logs = data.dailyLogs || [];
  let streak = 0;
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const log of sortedLogs) {
    if (log.disciplineScore >= 6) streak++;
    else break;
  }

  return (
    <div>
      {/* Streak banner */}
      {streak > 0 && (
        <Card style={{ background: 'linear-gradient(135deg, #0d1a0d, #0a0f0a)', borderColor: C.green + '44', textAlign: 'center', padding: '16px' }}>
          <div style={{ color: C.green, fontSize: 28, fontWeight: 700 }}>🔥 {streak}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>ימי משמעת רצופים</div>
        </Card>
      )}

      {/* Daily form */}
      <Card>
        <SectionTitle>יומן יומי — {form.date}</SectionTitle>
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 7, letterSpacing: 0.5 }}>תאריך</div>
          <input
            type="date" value={form.date}
            onChange={e => set('date', e.target.value)}
            style={{ width: '100%', background: '#0d0d16', border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 13px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 7, letterSpacing: 0.5 }}>מה קרה עם Setup היום?</div>
          <SegmentedControl
            value={form.sawSetup}
            onChange={v => set('sawSetup', v)}
            options={SETUP_OPTIONS}
          />
        </div>

        {form.sawSetup === 'missed' && (
          <Textarea
            label="למה פיספסת?"
            value={form.missedReason}
            onChange={v => set('missedReason', v)}
            placeholder="לא הייתי ליד המחשב / ראיתי מאוחר מדי..."
            rows={2}
          />
        )}

        {form.sawSetup === 'invalid' && (
          <Textarea
            label="למה לא עמד בקריטריונים?"
            value={form.missedReason}
            onChange={v => set('missedReason', v)}
            placeholder="ה-Setup לא היה מספיק נקי / RR לא הגיע ל-2:1..."
            rows={2}
          />
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 7, letterSpacing: 0.5 }}>מצב השוק היום</div>
          <SegmentedControl
            value={form.marketCondition}
            onChange={v => set('marketCondition', v)}
            options={[
              { value: 'trending', label: '📈 Trending', color: C.green },
              { value: 'ranging', label: '↔️ Ranging', color: C.blue },
              { value: 'volatile', label: '⚡ Volatile', color: C.red },
            ]}
          />
        </div>

        <Textarea
          label="משפט אחד על היום"
          value={form.dayNote}
          onChange={v => set('dayNote', v)}
          placeholder="ממה שראיתי היום, מה למדתי או מה הרגשתי..."
          rows={2}
        />

        <ScoreSlider
          label="ציון משמעת יומי"
          value={form.disciplineScore}
          onChange={v => set('disciplineScore', v)}
          rightLabel="1 — יום קשה"
          leftLabel="10 — יום מושלם"
        />

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 7, letterSpacing: 0.5 }}>האם אתה מתכנן לסחור מחר?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['yes', '✅ כן', C.green], ['no', '❌ לא', C.red], ['maybe', '🤔 תלוי בשוק', C.muted]].map(([v, label, color]) => (
              <button key={v} onClick={() => set('willTradeTomorrow', v)} style={{
                flex: 1, padding: '9px 4px', borderRadius: 9,
                border: `1px solid ${form.willTradeTomorrow === v ? color : C.border}`,
                background: form.willTradeTomorrow === v ? color + '22' : 'transparent',
                color: form.willTradeTomorrow === v ? color : C.muted,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s'
              }}>{label}</button>
            ))}
          </div>
        </div>
      </Card>

      <Btn onClick={handleSave} color={C.accent}>💾 שמור יומן יומי</Btn>

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <SectionTitle>7 ימים אחרונים</SectionTitle>
          {recentLogs.map(log => {
            const opt = SETUP_OPTIONS.find(o => o.value === log.sawSetup);
            const dc = (log.disciplineScore || 0) >= 7 ? C.green : (log.disciplineScore || 0) >= 5 ? C.warn : C.red;
            return (
              <div key={log.id} style={{ padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: C.muted, fontSize: 12 }}>{log.date}</span>
                    <span style={{ color: opt?.color || C.muted, fontSize: 12, background: (opt?.color || C.muted) + '18', padding: '2px 8px', borderRadius: 20 }}>
                      {opt?.label || '—'}
                    </span>
                  </div>
                  <span style={{ color: dc, fontWeight: 700, fontSize: 16 }}>{log.disciplineScore}/10</span>
                </div>
                {log.dayNote && (
                  <div style={{ color: C.muted, fontSize: 12, fontStyle: 'italic', paddingRight: 4 }}>
                    "{log.dayNote}"
                  </div>
                )}
              </div>
            );
          })}

          {/* Weekly discipline average */}
          {recentLogs.length >= 3 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: C.card2, borderRadius: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.muted, fontSize: 12 }}>ממוצע משמעת 7 ימים</span>
              <span style={{ color: C.accent, fontWeight: 700, fontSize: 18 }}>
                {(recentLogs.reduce((s, l) => s + (l.disciplineScore || 0), 0) / recentLogs.length).toFixed(1)}/10
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
