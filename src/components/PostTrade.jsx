import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Check, Input, Select, Textarea, ScoreSlider, Btn, SegmentedControl } from './UI';



const PAIRS = ['GBPJPY', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'EURJPY', 'אחר'];

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  pair: 'GBPJPY',
  result: 'win',
  pips: '',
  closedByPlan: true,
  respected2R: true,
  triedHomeRun: false,
  changedFromEmotion: false,
  triedToRecover: false,
  violatedRule: false,
  whyEntered: '',
  feltBefore: '',
  feltDuring: '',
  mentalMistake: '',
  whatGood: '',
  whatFix: '',
  disciplineScore: 7,
  patienceScore: 7,
  emotionScore: 7,
  screenshots: ['', '', ''],
});

function TelegramScreenshot({ url, index, onChange }) {
  const [imgError, setImgError] = useState(false);
  const isValid = url && url.startsWith('http');



  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>
        📸 Screenshot {index + 1} {index === 0 ? '(Entry)' : index === 1 ? '(Exit)' : '(Multi-TF)'}
      </div>
      <input
        type="url"
        value={url}
        onChange={e => onChange(e.target.value)}
        placeholder="הדבק לינק מטלגרם..."
        style={{
          width: '100%', background: '#0d0d16', border: `1px solid ${isValid ? C.accent + '66' : C.border}`,
          borderRadius: 9, padding: '10px 13px', color: C.text,
          fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: isValid ? 8 : 0
        }}
        onFocus={e => e.target.style.borderColor = C.accent}
        onBlur={e => e.target.style.borderColor = isValid ? C.accent + '66' : C.border}
      />
      {isValid && (
        <div style={{ borderRadius: 9, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {!imgError ? (
            <img
              src={url}
              alt={`screenshot ${index + 1}`}
              onError={() => setImgError(true)}
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: C.card2, color: C.accent, textDecoration: 'none', fontSize: 13
            }}>
              <span style={{ fontSize: 20 }}>📷</span>
              <div>
                <div style={{ fontWeight: 600 }}>פתח תמונה בטלגרם</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{url.slice(0, 50)}...</div>
              </div>
              <span style={{ marginRight: 'auto', color: C.muted }}>↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostTrade({ data, save, showToast }) {
  const [form, setForm] = useState(emptyForm());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const avgScore = Math.round((form.disciplineScore + form.patienceScore + form.emotionScore) / 3);
  const avgColor = avgScore >= 7 ? C.green : avgScore >= 5 ? C.warn : C.red;

  const handleSave = () => {
    if (!form.pips && form.pips !== 0) { showToast('הזן כמה פיפס', 'err'); return; }
    const trade = { ...form, pips: parseFloat(form.pips) || 0, savedAt: new Date().toISOString(), id: Date.now() };
    let newData = { ...data, trades: [...data.trades, trade] };
    if (form.violatedRule) {
      const cd = new Date(); cd.setHours(cd.getHours() + 48);
      newData.cooldownUntil = cd.toISOString();
    }
    save(newData);
    showToast(form.violatedRule ? '⚠️ חריגה — עצירת 48 שעות הופעלה' : '✓ עסקה נשמרה!', form.violatedRule ? 'err' : 'ok');
    setForm(emptyForm());
  };

  const recentTrades = [...data.trades].reverse().slice(0, 6);

  return (
    <div>
      {/* Result */}
      <Card>
        <SectionTitle>תוצאת העסקה</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="תאריך" type="date" value={form.date} onChange={v => set('date', v)} />
          <Select label="צמד" value={form.pair} onChange={v => set('pair', v)} options={PAIRS} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 7, letterSpacing: 0.5 }}>תוצאה</div>
          <SegmentedControl
            value={form.result}
            onChange={v => set('result', v)}
            options={[
              { value: 'win', label: '🟢 רווח', color: C.green },
              { value: 'loss', label: '🔴 הפסד', color: C.red },
              { value: 'be', label: '⚪ BE', color: C.muted },
            ]}
          />
        </div>

        <Input
          label={`פיפס ${form.result === 'loss' ? '(מינוס להפסד, למשל -30)' : ''}`}
          type="number" value={form.pips}
          onChange={v => set('pips', v)}
          placeholder={form.result === 'loss' ? '-30' : '40'}
        />
      </Card>

      {/* Execution */}
      <Card>
        <SectionTitle>ביצוע העסקה</SectionTitle>
        <Check label="העסקה נסגרה לפי התוכנית המקורית" checked={form.closedByPlan} onChange={() => set('closedByPlan', !form.closedByPlan)} />
        <Check label="כיבדתי את ה-2R" checked={form.respected2R} onChange={() => set('respected2R', !form.respected2R)} />
        <div style={{ height: 1, background: C.border, margin: '8px 0' }} />
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>חריגות (סמן אם קרה)</div>
        <Check label="ניסיתי לעשות Home Run ❌" checked={form.triedHomeRun} onChange={() => set('triedHomeRun', !form.triedHomeRun)} danger />
        <Check label="שיניתי משהו מתוך רגש ❌" checked={form.changedFromEmotion} onChange={() => set('changedFromEmotion', !form.changedFromEmotion)} danger />
        <Check label="ניסיתי להחזיר הפסד ❌" checked={form.triedToRecover} onChange={() => set('triedToRecover', !form.triedToRecover)} danger />

        <div style={{ marginTop: 12, padding: '12px 14px', background: '#120808', border: `1px solid ${C.red}33`, borderRadius: 10 }}>
          <Check
            label="הפרתי חוק מהתוכנית — יש להפעיל עצירת 48 שעות 🚫"
            checked={form.violatedRule}
            onChange={() => set('violatedRule', !form.violatedRule)}
            danger
            sub="הזזת SL / משיכת TP / setup מאולתר / ניסיון החזרה"
          />
        </div>
      </Card>

      {/* Mental analysis */}
      <Card>
        <SectionTitle>ניתוח מנטלי</SectionTitle>
        <Textarea label="למה נכנסתי לעסקה?" value={form.whyEntered} onChange={v => set('whyEntered', v)} placeholder="הסיבה האמיתית..." rows={2} />
        <Textarea label="מה הרגשתי לפני הכניסה?" value={form.feltBefore} onChange={v => set('feltBefore', v)} placeholder="רגוע / לחוץ / סקרן..." rows={2} />
        <Textarea label="מה הרגשתי בזמן העסקה?" value={form.feltDuring} onChange={v => set('feltDuring', v)} placeholder="ביטחון / פחד / תאווה..." rows={2} />
        <Textarea label="טעות מנטלית (אם הייתה)" value={form.mentalMistake} onChange={v => set('mentalMistake', v)} placeholder="מה השתבש..." rows={2} />
        <Textarea label="מה עשיתי טוב?" value={form.whatGood} onChange={v => set('whatGood', v)} placeholder="חגוג כל ניצחון קטן..." rows={2} />
        <Textarea label="מה אני מתקן בפעם הבאה?" value={form.whatFix} onChange={v => set('whatFix', v)} placeholder="צעד אחד קונקרטי..." rows={2} />
      </Card>

      {/* Scores */}
      <Card>
        <SectionTitle>ציון עצמי</SectionTitle>
        <ScoreSlider label="משמעת" value={form.disciplineScore} onChange={v => set('disciplineScore', v)} rightLabel="1 — אפס שליטה" leftLabel="10 — שליטה מלאה" />
        <ScoreSlider label="סבלנות" value={form.patienceScore} onChange={v => set('patienceScore', v)} rightLabel="1 — חסרת סבלנות" leftLabel="10 — סבלני לגמרי" />
        <ScoreSlider label="שליטה ברגש" value={form.emotionScore} onChange={v => set('emotionScore', v)} rightLabel="1 — הרגש ניהל" leftLabel="10 — ניהלתי את הרגש" />
        <div style={{ textAlign: 'center', marginTop: 10, padding: '12px', background: avgColor + '11', borderRadius: 10 }}>
          <span style={{ color: C.muted, fontSize: 13 }}>ממוצע: </span>
          <span style={{ color: avgColor, fontSize: 26, fontWeight: 700 }}>{avgScore}</span>
          <span style={{ color: C.muted, fontSize: 13 }}>/10</span>
        </div>
      </Card>

      <Card>
        <SectionTitle>📸 Screenshots מטלגרם</SectionTitle>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 14, lineHeight: 1.7 }}>
          שלח Screenshot לטלגרם ← לחץ לחיצה ארוכה על התמונה ← Copy Link ← הדבק כאן
        </div>
        {form.screenshots.map((url, i) => (
          <TelegramScreenshot
            key={i}
            url={url}
            index={i}
            onChange={v => {
              const s = [...form.screenshots];
              s[i] = v;
              set('screenshots', s);
            }}
          />
        ))}
      </Card>

      <Btn onClick={handleSave} color={C.accent}>💾 שמור עסקה</Btn>

      {/* Recent trades */}
      {recentTrades.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <SectionTitle>עסקאות אחרונות</SectionTitle>
          {recentTrades.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{t.pair}</span>
                <span style={{ color: C.muted, fontSize: 11, marginRight: 8 }}>{t.date}</span>
                {t.violatedRule && <span style={{ color: C.red, fontSize: 10 }}>⚠️ חריגה</span>}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: 12 }}>🎯 {t.disciplineScore}/10</span>
                <span style={{
                  color: t.pips > 0 ? C.green : t.pips < 0 ? C.red : C.muted,
                  fontWeight: 700, fontSize: 17
                }}>
                  {t.pips > 0 ? '+' : ''}{t.pips}p
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
