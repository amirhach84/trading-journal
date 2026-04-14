import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Check, Input, Select, Textarea, ScoreSlider, Btn, SegmentedControl } from './UI';

const CHECKLIST = [
  'זה setup מלא לפי האסטרטגיה שלי',
  'זה לא setup מאולתר או בכוח',
  'ה-Entry ברור לחלוטין',
  'ה-SL ברור ומוגדר',
  'ה-TP מוגדר מראש',
  'ה-RR הוא 2:1 לפחות',
  'אני לא נכנס כדי להחזיר הפסד',
  'אני רגוע ולא מונע מרגש',
  'אני מוכן לקבל הפסד בלי לשנות את התוכנית',
  'אני לא מחפש Home Run',
];

const PAIRS = ['GBPJPY', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'EURJPY', 'אחר'];

export default function PreTrade({ data, save, showToast, isCooldown, weekStopped, weekSetups, daySetups }) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const [form, setForm] = useState({
    date: today, time: timeStr,
    pair: 'GBPJPY', direction: 'long', setupNum: '1',
    entry: '', sl: '', tp: '',
    checks: Array(10).fill(false),
    declarationRead: false,
    emotionalState: 7,
    notes: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCheck = (i) => {
    const c = [...form.checks]; c[i] = !c[i];
    set('checks', c);
  };

  const allChecked = form.checks.every(Boolean) && form.declarationRead;
  const dayLimit = daySetups >= 2;
  const blocked = isCooldown || weekStopped || dayLimit;

  const handleSave = () => {
    if (!allChecked) { showToast('סמן את כל הסעיפים לפני הכניסה', 'err'); return; }
    const openTrade = {
      ...form,
      id: Date.now(),
      savedAt: new Date().toISOString(),
      status: 'open',
    };
    const openTrades = [...(data.openTrades || []), openTrade];
    save({ ...data, openTrades, lastPre: openTrade });
    showToast('✓ עסקה נפתחה — בהצלחה!');
  };

  const emotionColor = form.emotionalState <= 3 ? C.red : form.emotionalState <= 5 ? C.warn : C.green;

  return (
    <div>
      {/* Block banners */}
      {isCooldown && (
        <Card style={{ background: '#1a0808', borderColor: C.red }}>
          <div style={{ color: C.red, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>🚫 עצירת 48 שעות פעילה</div>
          <div style={{ color: C.text, fontSize: 14 }}>אל תסחר. חזור לטאב החוקים לבדוק מתי מסתיים.</div>
        </Card>
      )}
      {!isCooldown && weekStopped && (
        <Card style={{ background: '#081a08', borderColor: C.green }}>
          <div style={{ color: C.green, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>✅ הגעת ל-100 פיפס השבוע!</div>
          <div style={{ color: C.text, fontSize: 14 }}>שבוע המסחר הסתיים. חזור שבוע הבא. כל הכבוד.</div>
        </Card>
      )}
      {!isCooldown && !weekStopped && daySetups >= 2 && (
        <Card style={{ background: '#1a120a', borderColor: C.warn }}>
          <div style={{ color: C.warn, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>⚠️ הגעת למקסימום 2 עסקאות להיום</div>
          <div style={{ color: C.text, fontSize: 14 }}>לא ניתן לקחת עסקאות נוספות היום. חזור מחר.</div>
        </Card>
      )}

      {/* Open trades */}
      {(data.openTrades || []).length > 0 && (
        <Card style={{ background: '#0d1a0d', borderColor: C.green + '44' }}>
          <SectionTitle>עסקאות פתוחות כרגע 🟢</SectionTitle>
          {(data.openTrades || []).map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{t.pair}</span>
                <span style={{ color: C.muted, fontSize: 12, marginRight: 8 }}>{t.date} {t.time}</span>
                <span style={{ color: t.direction === 'long' ? C.green : C.red, fontSize: 12 }}>{t.direction === 'long' ? '▲ Long' : '▼ Short'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: C.muted }}>
                <span>Entry: {t.entry}</span>
                <span>SL: {t.sl}</span>
                <span>TP: {t.tp}</span>
              </div>
            </div>
          ))}
          <div style={{ color: C.muted, fontSize: 12, marginTop: 10, textAlign: 'center' }}>לסגירת עסקה עבור לטאב אחרי</div>
        </Card>
      )}

      {/* Trade details */}
      <Card>
        <SectionTitle>פרטי העסקה</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="תאריך" type="date" value={form.date} onChange={v => set('date', v)} />
          <Input label="שעה" type="time" value={form.time} onChange={v => set('time', v)} />
        </div>
        <Select label="צמד" value={form.pair} onChange={v => set('pair', v)} options={PAIRS} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>כיוון</div>
            <SegmentedControl
              value={form.direction}
              onChange={v => set('direction', v)}
              options={[
                { value: 'long', label: '🟢 Long', color: C.green },
                { value: 'short', label: '🔴 Short', color: C.red },
              ]}
            />
          </div>
          <div>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>Setup מס׳</div>
            <SegmentedControl
              value={form.setupNum}
              onChange={v => set('setupNum', v)}
              options={[
                { value: '1', label: 'ראשון', color: C.accent },
                { value: '2', label: 'שני', color: C.accent },
              ]}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Input label="Entry" value={form.entry} onChange={v => set('entry', v)} placeholder="1.2850" />
          <Input label="Stop Loss" value={form.sl} onChange={v => set('sl', v)} placeholder="1.2820" />
          <Input label="Take Profit" value={form.tp} onChange={v => set('tp', v)} placeholder="1.2910" />
        </div>
      </Card>

      {/* Emotional state */}
      <Card>
        <SectionTitle>מצב רגשי</SectionTitle>
        <ScoreSlider
          label="כמה אתה רגוע עכשיו?"
          value={form.emotionalState}
          onChange={v => set('emotionalState', v)}
          rightLabel="1 — לחוץ מאוד"
          leftLabel="10 — רגוע לגמרי"
        />
        {form.emotionalState <= 4 && (
          <div style={{ padding: '11px 14px', background: '#1a0f08', border: `1px solid ${C.warn}44`, borderRadius: 9, color: C.warn, fontSize: 13, marginTop: 4 }}>
            ⚠️ המצב הרגשי שלך נמוך. שקול לחכות לפחות שעה לפני הכניסה.
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <div style={{
            background: emotionColor + '22', border: `1px solid ${emotionColor}44`,
            borderRadius: 20, padding: '4px 16px', color: emotionColor, fontSize: 13
          }}>
            {form.emotionalState <= 3 ? 'לחוץ / מוטרד' :
             form.emotionalState <= 5 ? 'ביניים' :
             form.emotionalState <= 7 ? 'סביר' : 'רגוע ומוכן'}
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card>
        <SectionTitle>צ׳קליסט לפני כניסה</SectionTitle>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          {form.checks.filter(Boolean).length}/10 סעיפים סומנו
        </div>
        {CHECKLIST.map((item, i) => (
          <Check key={i} label={item} checked={form.checks[i]} onChange={() => toggleCheck(i)} />
        ))}

        <div style={{ margin: '16px 0 10px', padding: '14px 16px', background: '#0d1020', border: `1px solid ${C.blue}33`, borderRadius: 10, lineHeight: 1.8, fontStyle: 'italic', color: C.blue, fontSize: 13 }}>
          "אני לא מחפש עסקה שתציל אותי. אני מחפש לבצע נכון. אם העסקה תפסיד — זה חלק מהמשחק. אם העסקה תגיע ל-2R — אני סוגר לפי התוכנית."
        </div>
        <Check
          label="קראתי את ההצהרה לפני הכניסה"
          checked={form.declarationRead}
          onChange={() => set('declarationRead', !form.declarationRead)}
        />

        {!allChecked && (
          <div style={{ textAlign: 'center', color: C.red, fontSize: 12, marginTop: 6 }}>
            {!form.declarationRead ? 'יש לקרוא את ההצהרה ולסמן' : `נותרו ${10 - form.checks.filter(Boolean).length} סעיפים`}
          </div>
        )}
      </Card>

      <Textarea
        label="הערות לפני כניסה"
        value={form.notes}
        onChange={v => set('notes', v)}
        placeholder="כל מה שאתה רוצה לרשום לפני הכניסה..."
        rows={3}
      />

      <Btn onClick={handleSave} disabled={!allChecked || blocked} color={C.green}>
        {isCooldown ? '🚫 עצירת 48 שעות פעילה' : weekStopped ? '🚫 הגעת ל-100 פיפס השבוע' : dayLimit ? '🚫 מקסימום 2 עסקאות היום' : allChecked ? '✓ שמור צ׳קליסט ועבור לעסקה' : 'יש לסמן את כל הסעיפים'}
      </Btn>
    </div>
  );
}
