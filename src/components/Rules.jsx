import { C } from '../theme';
import { Card, SectionTitle, Btn } from './UI';
import { exportData, importData } from '../storage';

export default function Rules({ data, save, showToast }) {
  const isCooldown = data.cooldownUntil && new Date() < new Date(data.cooldownUntil);
  const cooldownHoursLeft = isCooldown
    ? Math.ceil((new Date(data.cooldownUntil) - new Date()) / 3600000) : 0;

  const triggerCooldown = () => {
    const cd = new Date(); cd.setHours(cd.getHours() + 48);
    save({ ...data, cooldownUntil: cd.toISOString() });
    showToast('⏸️ עצירת 48 שעות הופעלה', 'err');
  };

  const clearCooldown = () => {
    save({ ...data, cooldownUntil: null });
    showToast('✓ עצירה בוטלה');
  };

  const handleExport = () => {
    exportData(data);
    showToast('✓ גיבוי יוצא...');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
      importData(
        e.target.files[0],
        (parsed) => { save(parsed); showToast('✓ נתונים יובאו בהצלחה!'); },
        (err) => showToast(err, 'err')
      );
    };
    input.click();
  };

  const handleReset = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את כל הנתונים? פעולה זו לא ניתנת לביטול.')) {
      save({ trades: [], weeklyPlans: [], cooldownUntil: null });
      showToast('✓ נתונים נמחקו');
    }
  };

  const RULES = [
    'אני לוקח רק 1–2 setups בשבוע',
    'כל עסקה היא 2R בלבד',
    'אין Home Run',
    '100 פיפס בשבוע = עצירה',
    'אין הפקדות חדשות ב-30 יום',
    'חריגה מהחוקים = עצירה ל-48 שעות',
    'המטרה שלי היא משמעת, לא ריגוש',
  ];

  const MORNING = [
    'אני לא חייב לקחת עסקה היום',
    'לא כל תנועה היא הזדמנות',
    'הפסד הוא חלק מהמשחק',
    '2R מספיק לי',
    'אני לא רודף אחרי החודש שעבר',
    'הכסף מגיע מהמשמעת, לא מהדחף',
  ];

  const EMERGENCY = [
    '"אני חייב להחזיר"',
    '"הפעם אני אתן לזה לרוץ ענק"',
    '"אין מצב שאני סוגר רק ב-2R"',
    '"אני אוסיף עוד כסף ואסדר את זה"',
  ];

  const WEEKS = [
    { title: 'שבוע 1 — ניקוי הראש', desc: 'להפסיק לפעול מתוך הכאב. לא מפקיד. Setup אחד מקסימום. 2R קבוע. לא מסתכל אחורה.', mantra: '"אני לא מתקן את העבר. אני מבצע את ההווה."' },
    { title: 'שבוע 2 — אימון על יציאה נכונה', desc: 'כל עסקה נסגרת בדיוק ב-TP או ב-SL לפי התוכנית. אסור למשוך, לסגור מוקדם, או להתאהב.', mantra: '"הצלחה היא לא כמה פיפס עשית — הצלחה היא אם כיבדת את היציאה."' },
    { title: 'שבוע 3 — אימון על סבלנות', desc: 'אם אין setup ברמה גבוהה — לא סוחרים. שבוע ללא עסקאות = הצלחה אם שמרת על החוקים.', mantra: '"0 עסקות + 0 חריגות = שבוע מושלם."' },
    { title: 'שבוע 4 — בניית אמון עצמי', desc: 'להוכיח לעצמך שאתה יכול לפעול מקצועית. בסוף כל יום: האם הייתי ממושמע?', mantra: '"האם פעלתי כמו סוחר, או כמו מישהו שרודף אחרי הפסד?"' },
  ];

  return (
    <div>
      {/* Main rules card */}
      <Card style={{ background: 'linear-gradient(135deg, #0d0d1a, #0a0d16)', borderColor: C.accent + '55' }}>
        <div style={{ color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: 3, marginBottom: 14 }}>7 החוקים שלי</div>
        {RULES.map((rule, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '11px 0', borderBottom: i < RULES.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ color: C.accent, fontSize: 14, fontWeight: 800, minWidth: 24, fontFamily: 'monospace' }}>{i + 1}.</div>
            <div style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{rule}</div>
          </div>
        ))}
      </Card>

      {/* Cooldown status */}
      <Card style={{ borderColor: isCooldown ? C.red + '66' : C.border, background: isCooldown ? '#0f0808' : C.card }}>
        <SectionTitle>עצירת 48 שעות</SectionTitle>
        {isCooldown ? (
          <>
            <div style={{ color: C.red, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              🚫 פעילה — נותרו {cooldownHoursLeft} שעות
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
              עד: {new Date(data.cooldownUntil).toLocaleString('he-IL')}
            </div>
            <Btn onClick={clearCooldown} color={C.muted}>בטל עצירה ידנית</Btn>
          </>
        ) : (
          <>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
              אם חרגת מהחוקים ולא רשמת עסקה — הפעל עצירה ידנית.
            </div>
            <Btn onClick={triggerCooldown} color={C.red}>🚫 הפעל עצירת 48 שעות</Btn>
          </>
        )}
      </Card>

      {/* Morning phrases */}
      <Card>
        <SectionTitle>משפטים לקריאה כל בוקר</SectionTitle>
        {MORNING.map((p, i) => (
          <div key={i} style={{ padding: '10px 14px', marginBottom: 8, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 13, lineHeight: 1.6 }}>
            • {p}
          </div>
        ))}
      </Card>

      {/* Emergency */}
      <Card style={{ borderColor: C.red + '44', background: '#0f0808' }}>
        <SectionTitle>🚨 חוקי חירום — אם אתה מרגיש את זה, עצור</SectionTitle>
        {EMERGENCY.map((e, i) => (
          <div key={i} style={{ padding: '10px 14px', marginBottom: 8, background: '#1a0808', border: `1px solid ${C.red}33`, borderRadius: 9, color: C.red, fontSize: 14 }}>
            {e}
          </div>
        ))}
        <div style={{ color: C.muted, fontSize: 13, marginTop: 12, lineHeight: 1.9 }}>
          אם אחד מאלה קורה:<br />
          ➤ סגור את הגרף<br />
          ➤ כתוב מה אתה מרגיש<br />
          ➤ חזור רק אחרי שעה לפחות<br />
          ➤ אם צריך — יום שלם
        </div>
      </Card>

      {/* 4-week plan */}
      <Card>
        <SectionTitle>תוכנית 4 שבועות</SectionTitle>
        {WEEKS.map((w, i) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ color: C.accent, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{w.title}</div>
            <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>{w.desc}</div>
            <div style={{ color: C.blue, fontSize: 12, fontStyle: 'italic' }}>{w.mantra}</div>
          </div>
        ))}
      </Card>

      {/* Data management */}
      <Card>
        <SectionTitle>ניהול נתונים</SectionTitle>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.7 }}>
          הנתונים שלך שמורים בדפדפן (localStorage). מומלץ לגבות מדי פעם.
          <br />סה״כ עסקאות: <span style={{ color: C.accent }}>{data.trades.length}</span> | שבועות: <span style={{ color: C.accent }}>{data.weeklyPlans.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={handleExport} style={{
            background: C.green + '15', border: `1px solid ${C.green}44`,
            color: C.green, padding: '11px', borderRadius: 9,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600
          }}>📤 ייצא גיבוי JSON</button>
          <button onClick={handleImport} style={{
            background: C.blue + '15', border: `1px solid ${C.blue}44`,
            color: C.blue, padding: '11px', borderRadius: 9,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600
          }}>📥 ייבא גיבוי</button>
        </div>
        <button onClick={handleReset} style={{
          background: 'transparent', border: `1px solid ${C.muted2}`,
          color: C.muted, padding: '9px', borderRadius: 9, marginTop: 8,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, width: '100%'
        }}>🗑 מחק את כל הנתונים</button>
      </Card>

      {/* Final mantra */}
      <div style={{ textAlign: 'center', padding: '28px 20px', lineHeight: 2 }}>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>המשפט שלך</div>
        <div style={{ color: C.accent, fontSize: 17, fontStyle: 'italic', fontWeight: 600 }}>
          "אני לא צריך עסקה גדולה.
        </div>
        <div style={{ color: C.accent, fontSize: 17, fontStyle: 'italic', fontWeight: 600 }}>
          אני צריך חודש נקי."
        </div>
      </div>
    </div>
  );
}
