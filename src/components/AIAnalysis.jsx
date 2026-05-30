import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Btn } from './UI';

const SYSTEM_PROMPT_HE = `אתה מאמן מסחר מקצועי המתמחה בפסיכולוגיית מסחר ומשמעת.
אתה מקבל נתונים מיומן המסחר של הסוחר ועליך לנתח אותם ולהציג תובנות מעמיקות.

פורמט התשובה - השתמש ב-Markdown:
## 📊 סיכום ביצועים
## 💪 חוזקות שזיהיתי
## ⚠️ תחומים לשיפור
## 🧠 דפוסים מנטליים
## 🎯 המלצות קונקרטיות לחודש הבא
## 💬 מסר אישי

ענה בעברית בלבד. היה ספציפי, ישיר ותומך.`;

const SYSTEM_PROMPT_EN = `You are a professional trading coach specializing in trading psychology and discipline.
You receive data from the trader's journal and must analyze it and present deep insights.

Response format - use Markdown:
## 📊 Performance Summary
## 💪 Strengths I Identified
## ⚠️ Areas for Improvement
## 🧠 Mental Patterns
## 🎯 Concrete Recommendations for Next Month
## 💬 Personal Message

Answer in English only. Be specific, direct and supportive.`;

function buildPrompt(data, lang) {
  const trades = data.trades || [];
  const dailyLogs = data.dailyLogs || [];
  const weeklyPlans = data.weeklyPlans || [];

  const total = trades.length;
  const wins = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const allPips = trades.reduce((s, t) => s + (t.pips || 0), 0);
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : 0;
  const avgDisc = total > 0 ? (trades.reduce((s, t) => s + (t.disciplineScore || 0), 0) / total).toFixed(1) : 0;
  const avgPat = total > 0 ? (trades.reduce((s, t) => s + (t.patienceScore || 0), 0) / total).toFixed(1) : 0;
  const avgEmo = total > 0 ? (trades.reduce((s, t) => s + (t.emotionScore || 0), 0) / total).toFixed(1) : 0;
  const violations = trades.filter(t => t.violatedRule).length;

  const byDay = {};
  trades.forEach(t => {
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const key = dayNames[new Date(t.date).getDay()];
    if (!byDay[key]) byDay[key] = { pips: 0, count: 0, wins: 0 };
    byDay[key].pips += t.pips || 0;
    byDay[key].count++;
    if (t.result === 'win') byDay[key].wins++;
  });

  const mentalNotes = trades
    .filter(t => t.whyEntered || t.mentalMistake || t.feltDuring)
    .slice(-15)
    .map(t => `[${t.date} ${t.pair} ${t.pips > 0 ? '+' : ''}${t.pips}p | D:${t.disciplineScore}/10]:
  Why: ${t.whyEntered || '-'}
  Mistake: ${t.mentalMistake || '-'}
  Felt: ${t.feltDuring || '-'}`)
    .join('\n');

  const dailyNotes = dailyLogs
    .filter(l => l.dayNote)
    .slice(-10)
    .map(l => `[${l.date}] ${l.sawSetup} | Score:${l.disciplineScore}/10 | "${l.dayNote}"`)
    .join('\n');

  const weeklyReviews = weeklyPlans
    .filter(w => w.dangerHabit || w.goodHabit)
    .slice(-4)
    .map(w => `Week ${w.weekStart}: Danger:"${w.dangerHabit||'-'}" Good:"${w.goodHabit||'-'}" Fix:"${w.nextWeekFix||'-'}"`)
    .join('\n');

  const isHe = lang === 'he';
  return `${isHe ? 'נתוני יומן המסחר שלי' : 'My trading journal data'}:

=== ${isHe ? 'סטטיסטיקות' : 'STATISTICS'} ===
${isHe ? 'סה״כ עסקאות' : 'Total trades'}: ${total} | Win Rate: ${winRate}% | ${isHe ? 'סה״כ פיפס' : 'Total pips'}: ${allPips.toFixed(1)}
${isHe ? 'רווח' : 'Wins'}: ${wins} | ${isHe ? 'הפסד' : 'Losses'}: ${losses} | ${isHe ? 'חריגות' : 'Violations'}: ${violations}
${isHe ? 'משמעת' : 'Discipline'}: ${avgDisc}/10 | ${isHe ? 'סבלנות' : 'Patience'}: ${avgPat}/10 | ${isHe ? 'רגש' : 'Emotion'}: ${avgEmo}/10

=== ${isHe ? 'לפי יום' : 'BY DAY'} ===
${Object.entries(byDay).map(([d,v]) => `${d}: ${v.pips>=0?'+':''}${v.pips.toFixed(0)}p (${v.count} trades, ${v.count>0?Math.round(v.wins/v.count*100):0}% win)`).join(' | ')}

=== ${isHe ? 'הערות מנטליות' : 'MENTAL NOTES'} ===
${mentalNotes || (isHe ? 'אין' : 'None')}

=== ${isHe ? 'יומן יומי' : 'DAILY LOG'} ===
${dailyNotes || (isHe ? 'אין' : 'None')}

=== ${isHe ? 'סיכומים שבועיים' : 'WEEKLY REVIEWS'} ===
${weeklyReviews || (isHe ? 'אין' : 'None')}`;
}

function MarkdownRenderer({ text }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return (
          <div key={i} style={{ color: C.accent, fontSize: 15, fontWeight: 700, marginTop: 18, marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
            {line.replace('## ', '')}
          </div>
        );
        if (line.startsWith('- ') || line.startsWith('• ')) return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
            <span style={{ color: C.accent }}>•</span>
            <span style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>{line.replace(/^[-•] /, '')}</span>
          </div>
        );
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i} style={{ color: C.text, fontSize: 14, lineHeight: 1.7, marginBottom: 3 }}>
            {parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi}>{p}</strong> : p)}
          </div>
        );
      })}
    </div>
  );
}

export default function AIAnalysis({ data }) {
  const [lang, setLang] = useState('he');
  const [period, setPeriod] = useState('all');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getFilteredData = () => {
    const now = new Date();
    let cutoff = null;
    if (period === 'month') cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'week') { cutoff = new Date(now); cutoff.setDate(now.getDate() - 7); }
    if (!cutoff) return data;
    return {
      ...data,
      trades: (data.trades || []).filter(t => new Date(t.date) >= cutoff),
      dailyLogs: (data.dailyLogs || []).filter(l => new Date(l.date) >= cutoff),
      weeklyPlans: (data.weeklyPlans || []).filter(w => new Date(w.savedAt || w.weekStart) >= cutoff),
    };
  };

  const runAnalysis = async () => {
    const filtered = getFilteredData();
    if (!(filtered.trades || []).length) {
      setError(lang === 'he' ? 'אין עסקאות בתקופה הנבחרת' : 'No trades in selected period');
      return;
    }
    setLoading(true); setError(''); setAnalysis('');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: lang === 'he' ? SYSTEM_PROMPT_HE : SYSTEM_PROMPT_EN,
          messages: [{ role: 'user', content: buildPrompt(filtered, lang) }],
        }),
      });
      const result = await response.json();
      if (result.content?.[0]?.text) setAnalysis(result.content[0].text);
      else throw new Error(result.error?.message || 'No response');
    } catch (e) {
      setError(lang === 'he' ? 'שגיאה בהרצת הניתוח. נסה שוב.' : 'Error running analysis. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard for manual Claude analysis
  const copyForClaude = () => {
    const filtered = getFilteredData();
    const prompt = `${lang === 'he' ? SYSTEM_PROMPT_HE : SYSTEM_PROMPT_EN}\n\n---\n\n${buildPrompt(filtered, lang)}`;
    navigator.clipboard.writeText(prompt);
  };

  const trades = data.trades || [];
  const filtered = getFilteredData();

  return (
    <div>
      <Card style={{ background: 'linear-gradient(135deg, #0d0d1a, #0a0d16)', borderColor: C.accent + '44' }}>
        <SectionTitle>🤖 AI Trading Coach</SectionTitle>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
          {lang === 'he' ? 'הסוכן יעבור על כל הנתונים שלך ויציג ניתוח מעמיק עם המלצות קונקרטיות.' : 'The agent will analyze all your data and provide deep insights with concrete recommendations.'}
        </div>

        {/* Language */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>שפה / Language</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['he','🇮🇱 עברית'],['en','🇺🇸 English']].map(([v,l]) => (
              <button key={v} onClick={() => { setLang(v); setAnalysis(''); }} style={{
                flex: 1, padding: '10px 0', borderRadius: 9,
                border: `1px solid ${lang===v ? C.accent : C.border}`,
                background: lang===v ? C.accent+'18' : 'transparent',
                color: lang===v ? C.accent : C.muted,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Period */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>{lang==='he' ? 'תקופה' : 'Period'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['all', lang==='he'?'כל הזמן':'All time'],['month', lang==='he'?'חודש נוכחי':'This month'],['week', lang==='he'?'7 ימים':'7 days']].map(([v,l]) => (
              <button key={v} onClick={() => { setPeriod(v); setAnalysis(''); }} style={{
                flex: 1, padding: '9px 4px', borderRadius: 9,
                border: `1px solid ${period===v ? C.blue : C.border}`,
                background: period===v ? C.blue+'18' : 'transparent',
                color: period===v ? C.blue : C.muted,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ background: C.card2, borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.muted }}>
          {lang==='he'?'מנתח':'Analyzing'}: <span style={{ color: C.text, fontWeight: 600 }}>{(filtered.trades||[]).length} {lang==='he'?'עסקאות':'trades'}</span>
          {' + '}<span style={{ color: C.text, fontWeight: 600 }}>{(filtered.dailyLogs||[]).length} {lang==='he'?'יומן יומי':'daily logs'}</span>
        </div>

        {/* Main button */}
        <Btn onClick={runAnalysis} disabled={loading || !trades.length} color={C.accent}>
          {loading ? (lang==='he'?'🔄 מנתח...':'🔄 Analyzing...') : (lang==='he'?'🤖 הפעל ניתוח AI':'🤖 Run AI Analysis')}
        </Btn>

        {/* Manual option */}
        <div style={{ marginTop: 12, padding: '14px', background: C.card2, borderRadius: 9, border: `1px solid ${C.border}` }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {lang==='he' ? '💬 ניתוח ידני דרך Claude.ai' : '💬 Manual analysis via Claude.ai'}
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 10, lineHeight: 1.6 }}>
            {lang==='he'
              ? 'לחץ כדי להעתיק את כל הנתונים שלך ← פתח שיחה חדשה ב-Claude.ai ← הדבק ← קבל ניתוח מלא'
              : 'Click to copy all your data ← open a new chat on Claude.ai ← paste ← get full analysis'}
          </div>
          <button onClick={copyForClaude} style={{
            width: '100%', background: C.blue+'18', border: `1px solid ${C.blue}44`,
            color: C.blue, padding: '10px', borderRadius: 8,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600
          }}>
            {lang==='he' ? '📋 העתק נתונים לניתוח ב-Claude.ai' : '📋 Copy data for Claude.ai analysis'}
          </button>
        </div>

        {!trades.length && (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            {lang==='he' ? 'הוסף עסקאות כדי לקבל ניתוח' : 'Add trades to get analysis'}
          </div>
        )}
      </Card>

      {error && (
        <Card style={{ borderColor: C.red+'44', background: '#0f0808' }}>
          <div style={{ color: C.red, fontSize: 14 }}>{error}</div>
        </Card>
      )}

      {loading && (
        <Card style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <div style={{ color: C.accent, fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {lang==='he' ? 'המאמן שלך עובד...' : 'Your coach is working...'}
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            {lang==='he' ? 'עובר על כל הנתונים שלך' : 'Going through all your data'}
          </div>
        </Card>
      )}

      {analysis && !loading && (
        <Card style={{ borderColor: C.accent+'33' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle>{lang==='he' ? '📋 ניתוח המאמן שלך' : '📋 Your Coach Analysis'}</SectionTitle>
            <button onClick={() => setAnalysis('')} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>✕</button>
          </div>
          <MarkdownRenderer text={analysis} />
          <div style={{ marginTop: 20, padding: '10px 14px', background: C.card2, borderRadius: 9, color: C.muted, fontSize: 11, textAlign: 'center' }}>
            {lang==='he' ? 'ניתוח זה מבוסס על הנתונים שהזנת. אינו ייעוץ פיננסי.' : 'This analysis is based on your entered data. Not financial advice.'}
          </div>
        </Card>
      )}
    </div>
  );
}
