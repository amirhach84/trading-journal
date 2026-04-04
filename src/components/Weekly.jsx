import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Check, Textarea, Btn, YesNo, StatBox } from './UI';

const emptyForm = () => ({
  weekStart: new Date().toISOString().slice(0, 10),
  goalExecution: false, goal2R: false, goalNoRecover: false,
  goalStop100: false, goalNoForce: false,
  confirmedStop100: false, confirmedNoSetup: false,
  weekGoal: '',
  stopped100: null, onlyRealSetups: null,
  triedHomeRun: null, kept2R: null, deposited: null,
  dangerHabit: '', goodHabit: '', nextWeekFix: '',
  weekMotto: '',
});

export default function Weekly({ data, save, showToast, weekTrades, weekPips, weekSetups }) {
  const [form, setForm] = useState(emptyForm());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const weekStopped = weekPips >= 100;
  const pipsColor = weekStopped ? C.red : weekPips > 60 ? C.warn : C.green;

  const saveWeekly = () => {
    const plan = { ...form, savedAt: new Date().toISOString(), id: Date.now(), weekPips, weekSetups };
    save({ ...data, weeklyPlans: [...data.weeklyPlans, plan] });
    showToast('✓ סיכום שבועי נשמר!');
  };

  const WEEK_MOTTOS = [
    '"אני לא מתקן את העבר. אני מבצע את ההווה."',
    '"הצלחה היא כיבדת את היציאה."',
    '"0 עסקות + שמרתי על החוקים = שבוע מוצלח."',
    '"האם פעלתי כמו סוחר?"',
    '"אני לא צריך עסקה גדולה. אני צריך חודש נקי."',
  ];

  const recentPlans = [...data.weeklyPlans].reverse().slice(0, 3);

  return (
    <div>
      {/* Current week status */}
      <Card style={{ background: 'linear-gradient(135deg, #0d0d1a, #0a0d16)', borderColor: C.blue + '44' }}>
        <SectionTitle>סטטוס שבוע נוכחי</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <StatBox label="פיפס השבוע" value={weekPips.toFixed(0)} unit="/100" color={pipsColor} />
          <StatBox label="Setups" value={weekSetups} unit="/2" color={weekSetups >= 2 ? C.red : C.accent} />
          <StatBox label="עסקאות השבוע" value={weekTrades.length} color={C.text} />
        </div>

        {weekStopped && (
          <div style={{ padding: '12px 14px', background: '#081a08', border: `1px solid ${C.green}44`, borderRadius: 10, color: C.green, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
            🎯 100 פיפס הושגו — שבוע המסחר הסתיים. כל הכבוד!
          </div>
        )}

        {weekTrades.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {weekTrades.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.muted }}>{t.date} — <span style={{ color: C.text }}>{t.pair}</span></span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>🎯{t.disciplineScore}/10</span>
                  <span style={{ color: t.pips > 0 ? C.green : t.pips < 0 ? C.red : C.muted, fontWeight: 600 }}>
                    {t.pips > 0 ? '+' : ''}{t.pips}p
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Weekly planning */}
      <Card>
        <SectionTitle>תכנון לפני פתיחת השבוע</SectionTitle>
        <Textarea
          label="המטרה שלי לשבוע הזה"
          value={form.weekGoal}
          onChange={v => set('weekGoal', v)}
          placeholder="ביצוע נכון, לא רווח..."
          rows={2}
        />

        <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>אני מתחייב לשבוע הזה:</div>
        <Check label="לבצע רק עסקאות לפי החוקים" checked={form.goalExecution} onChange={() => set('goalExecution', !form.goalExecution)} />
        <Check label="לשמור על 2R קבוע" checked={form.goal2R} onChange={() => set('goal2R', !form.goal2R)} />
        <Check label="לא לנסות להחזיר הפסדים" checked={form.goalNoRecover} onChange={() => set('goalNoRecover', !form.goalNoRecover)} />
        <Check label="לעצור ב-100 פיפס" checked={form.goalStop100} onChange={() => set('goalStop100', !form.goalStop100)} />
        <Check label="לא להכריח setup שלא קיים" checked={form.goalNoForce} onChange={() => set('goalNoForce', !form.goalNoForce)} />

        <div style={{ padding: '12px 14px', background: '#0d1020', borderRadius: 10, marginTop: 8, marginBottom: 14 }}>
          <Check
            label="אם אגיע ל-100 פיפס — אני מפסיק לסחור עד שבוע הבא"
            checked={form.confirmedStop100}
            onChange={() => set('confirmedStop100', !form.confirmedStop100)}
          />
          <Check
            label="אם אין setup אמיתי — אני לא סוחר בכלל"
            checked={form.confirmedNoSetup}
            onChange={() => set('confirmedNoSetup', !form.confirmedNoSetup)}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>בחר מנטרה לשבוע הזה:</div>
          {WEEK_MOTTOS.map((m, i) => (
            <button key={i} onClick={() => set('weekMotto', m)} style={{
              display: 'block', width: '100%', textAlign: 'right',
              background: form.weekMotto === m ? C.accent + '15' : 'transparent',
              border: `1px solid ${form.weekMotto === m ? C.accent + '66' : C.border}`,
              borderRadius: 8, padding: '9px 12px', marginBottom: 6,
              color: form.weekMotto === m ? C.accent : C.muted,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontStyle: 'italic',
              transition: 'all 0.15s'
            }}>{m}</button>
          ))}
        </div>
      </Card>

      {/* Weekly review */}
      <Card>
        <SectionTitle>סיכום סוף שבוע</SectionTitle>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>עצרתי ב-100 פיפס כשהגעתי?</div>
          <YesNo value={form.stopped100} onChange={v => set('stopped100', v)} na />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>לקחתי רק setups אמיתיים?</div>
          <YesNo value={form.onlyRealSetups} onChange={v => set('onlyRealSetups', v)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>ניסיתי לעשות Home Run?</div>
          <YesNo value={form.triedHomeRun} onChange={v => set('triedHomeRun', v)} reverse />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>שמרתי על 2R?</div>
          <YesNo value={form.kept2R} onChange={v => set('kept2R', v)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>הפקדתי כסף השבוע? (אמור להיות לא!)</div>
          <YesNo value={form.deposited} onChange={v => set('deposited', v)} reverse />
        </div>

        <Textarea label="ההרגל הכי מסוכן שלי השבוע" value={form.dangerHabit} onChange={v => set('dangerHabit', v)} placeholder="..." rows={2} />
        <Textarea label="ההרגל הכי טוב שלי השבוע" value={form.goodHabit} onChange={v => set('goodHabit', v)} placeholder="..." rows={2} />
        <Textarea label="מה אני משפר בשבוע הבא?" value={form.nextWeekFix} onChange={v => set('nextWeekFix', v)} placeholder="צעד אחד ספציפי וקונקרטי..." rows={2} />
      </Card>

      <Btn onClick={saveWeekly} color={C.accent}>💾 שמור תכנון / סיכום שבועי</Btn>

      {/* Recent weekly plans */}
      {recentPlans.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <SectionTitle>סיכומים שבועיים אחרונים</SectionTitle>
          {recentPlans.map(p => (
            <div key={p.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: C.text, fontSize: 14 }}>שבוע {p.weekStart}</span>
                <span style={{ color: p.weekPips >= 100 ? C.green : C.accent, fontWeight: 700 }}>{p.weekPips?.toFixed(0)}p</span>
              </div>
              {p.weekGoal && <div style={{ color: C.muted, fontSize: 12 }}>{p.weekGoal}</div>}
              {p.weekMotto && <div style={{ color: C.blue, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>{p.weekMotto}</div>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
