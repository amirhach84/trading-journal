import { useState } from 'react';
import { C } from '../theme';
import { Card, SectionTitle, Btn } from './UI';

const SYSTEM_PROMPT_HE = `אתה מאמן מסחר מקצועי המתמחה בפסיכולוגיית מסחר ומשמעת. 
אתה מקבל נתונים מיומן המסחר של הסוחר ועליך לנתח אותם ולהציג תובנות מעמיקות.

הנחיות לניתוח:
1. נתח את הביצועים הכמותיים (פיפס, Win Rate, ימי שבוע, שעות)
2. זהה דפוסים מנטליים מהערות הסוחר
3. זהה חוזקות וחולשות ספציפיות
4. תן המלצות קונקרטיות ומעשיות
5. התייחס לחריגות מהחוקים אם היו
6. השתמש בטון תומך אך ישיר

פורמט התשובה - השתמש ב-Markdown:
## 📊 סיכום ביצועים
## 💪 חוזקות שזיהיתי
## ⚠️ תחומים לשיפור  
## 🧠 דפוסים מנטליים
## 🎯 המלצות קונקרטיות לחודש הבא
## 💬 מסר אישי

ענה בעברית בלבד.`;

const SYSTEM_PROMPT_EN = `You are a professional trading coach specializing in trading psychology and discipline.
You receive data from the trader's journal and must analyze it and present deep insights.

Analysis guidelines:
1. Analyze quantitative performance (pips, Win Rate, day of week, hours)
2. Identify mental patterns from the trader's notes
3. Identify specific strengths and weaknesses
4. Give concrete and actionable recommendations
5. Address rule violations if any occurred
6. Use a supportive but direct tone

Response format - use Markdown:
## 📊 Performance Summary
## 💪 Strengths I Identified
## ⚠️ Areas for Improvement
## 🧠 Mental Patterns
## 🎯 Concrete Recommendations for Next Month
## 💬 Personal Message

Answer in English only.`;

function buildPrompt(data, lang) {
  const trades = data.trades || [];
  const dailyLogs = data.dailyLogs || [];
  const weeklyPlans = data.weeklyPlans || [];

  // Stats
  const total = trades.length;
  const wins = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const allPips = trades.reduce((s, t) => s + (t.pips || 0), 0);
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : 0;
  const avgDisc = total > 0 ? (trades.reduce((s, t) => s + (t.disciplineScore || 0), 0) / total).toFixed(1) : 0;
  const avgPat = total > 0 ? (trades.reduce((s, t) => s + (t.patienceScore || 0), 0) / total).toFixed(1) : 0;
  const avgEmo = total > 0 ? (trades.reduce((s, t) => s + (t.emotionScore || 0), 0) / total).toFixed(1) : 0;
  const violations = trades.filter(t => t.violatedRule).length;

  // Best/worst day
  const byDay = {};
  trades.forEach(t => {
    const d = new Date(t.date).getDay();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const key = dayNames[d];
    if (!byDay[key]) byDay[key] = { pips: 0, count: 0 };
    byDay[key].pips += t.pips || 0;
    byDay[key].count++;
  });

  // Mental notes
  const mentalNotes = trades
    .filter(t => t.whyEntered || t.mentalMistake || t.feltDuring)
    .map(t => `[${t.date} ${t.pair} ${t.pips > 0 ? '+' : ''}${t.pips}p]:
    Why: ${t.whyEntered || '-'}
    Mental mistake: ${t.mentalMistake || '-'}
    Felt during: ${t.feltDuring || '-'}
    Discipline: ${t.disciplineScore}/10`)
    .join('\n\n');

  const dailyNotes = dailyLogs
    .filter(l => l.dayNote)
    .map(l => `[${l.date}] ${l.sawSetup} | Score: ${l.disciplineScore}/10 | "${l.dayNote}"`)
    .join('\n');

  const weeklyReviews = weeklyPlans
    .filter(w => w.dangerHabit || w.goodHabit || w.nextWeekFix)
    .map(w => `Week ${w.weekStart}: Danger: ${w.dangerHabit || '-'} | Good: ${w.goodHabit || '-'} | Fix: ${w.nextWeekFix || '-'}`)
    .join('\n');

  const isHe = lang === 'he';

  return `${isHe ? 'נתוני יומן המסחר שלי:' : 'My trading journal data:'}

=== ${isHe ? 'סטטיסטיקות' : 'STATISTICS'} ===
${isHe ? 'סה״כ עסקאות' : 'Total trades'}: ${total}
Win Rate: ${winRate}%
${isHe ? 'סה״כ פיפס' : 'Total pips'}: ${allPips.toFixed(1)}
${isHe ? 'רווח' : 'Wins'}: ${wins} | ${isHe ? 'הפסד' : 'Losses'}: ${losses}
${isHe ? 'ממוצע משמעת' : 'Avg discipline'}: ${avgDisc}/10
${isHe ? 'ממוצע סבלנות' : 'Avg patience'}: ${avgPat}/10
${isHe ? 'ממוצע שליטה ברגש' : 'Avg emotion control'}: ${avgEmo}/10
${isHe ? 'חריגות מהחוקים' : 'Rule violations'}: ${violations}

=== ${isHe ? 'ביצועים לפי יום' : 'BY DAY OF WEEK'} ===
${Object.entries(byDay).map(([day, d]) => `${day}: ${d.pips > 0 ? '+' : ''}${d.pips.toFixed(0)}p (${d.count} trades, ${((trades.filter(t => { const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; return dayNames[new Date(t.date).getDay()] === day && t.result === 'win'; }).length / d.count) * 100).toFixed(0)}% win)`).join('\n')}

=== ${isHe ? 'הערות מנטליות מהעסקאות' : 'MENTAL NOTES FROM TRADES'} ===
${mentalNotes || (isHe ? 'אין הערות' : 'No notes')}

=== ${isHe ? 'יומן יומי' : 'DAILY LOG'} ===
${dailyNotes || (isHe ? 'אין רשומות יומיות' : 'No daily logs')}

=== ${isHe ? 'סיכומים שבועיים' : 'WEEKLY REVIEWS'} ===
${weeklyReviews || (isHe ? 'אין סיכומים שבועיים' : 'No weekly reviews')}

${isHe ? 'אנא נתח את הנתונים האלה ותן לי ניתוח מעמיק ומועיל.' : 'Please analyze this data and give me a deep and helpful analysis.'}`;
}

function MarkdownRenderer({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      elements.push(
        <div key={i} style={{ color: C.accent, fontSize: 16, fontWeight: 700, marginTop: 20, marginBottom: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
          {line.replace('## ', '')}
        </div>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <div key={i} style={{ color: C.text, fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 6 }}>
          {line.replace('### ', '')}
        </div>
      );
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ color: C.accent, marginTop: 2 }}>•</span>
          <span style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>{line.replace(/^[-•] /, '')}</span>
        </div>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <div key={i} style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          {line.replace(/\*\*/g, '')}
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      // Handle inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <div key={i} style={{ color: C.text, fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>
          {parts.map((part, pi) => pi % 2 === 1
            ? <strong key={pi} style={{ color: C.text, fontWeight: 700 }}>{part}</strong>
            : part
          )}
        </div>
      );
    }
    i++;
  }
  return <div>{elements}</div>;
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
    if (period === 'month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
    }
    if (!cutoff) return data;
    return {
      ...data,
      trades: (data.trades || []).filter(t => new Date(t.date) >= cutoff),
      dailyLogs: (data.dailyLogs || []).filter(l => new Date(l.date) >= cutoff),
      weeklyPlans: (data.weeklyPlans || []).filter(w => new Date(w.weekStart || w.savedAt) >= cutoff),
    };
  };

  const runAnalysis = async () => {
    const filtered = getFilteredData();
    if ((filtered.trades || []).length === 0) {
      setError(lang === 'he' ? 'אין עסקאות בתקופה הנבחרת' : 'No trades in selected period');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis('');

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
      if (result.content && result.content[0]) {
        setAnalysis(result.content[0].text);
      } else {
        throw new Error('No response');
      }
    } catch (e) {
      setError(lang === 'he' ? 'שגיאה בהרצת הניתוח. נסה שוב.' : 'Error running analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const trades = data.trades || [];
  const total = trades.length;

  return (
    <div>
      <Card style={{ background: 'linear-gradient(135deg, #0d0d1a, #0a0d16)', borderColor: C.accent + '44' }}>
        <SectionTitle>🤖 AI Trading Coach</SectionTitle>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.7 }}>
          {lang === 'he'
            ? 'הסוכן יעבור על כל הנתונים שלך — עסקאות, ציונים, הערות מנטליות, יומן יומי — ויציג ניתוח מעמיק עם המלצות קונקרטיות.'
            : 'The agent will go through all your data — trades, scores, mental notes, daily log — and provide a deep analysis with concrete recommendations.'}
        </div>

        {/* Language selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>שפה / Language</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['he', '🇮🇱 עברית'], ['en', '🇺🇸 English']].map(([v, label]) => (
              <button key={v} onClick={() => { setLang(v); setAnalysis(''); }} style={{
                flex: 1, padding: '10px 0', borderRadius: 9,
                border: `1px solid ${lang === v ? C.accent : C.border}`,
                background: lang === v ? C.accent + '18' : 'transparent',
                color: lang === v ? C.accent : C.muted,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                transition: 'all 0.15s'
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Period selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>
            {lang === 'he' ? 'תקופה לניתוח' : 'Analysis period'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              ['all', lang === 'he' ? 'כל הזמן' : 'All time'],
              ['month', lang === 'he' ? 'חודש נוכחי' : 'This month'],
              ['week', lang === 'he' ? '7 ימים' : 'Last 7 days'],
            ].map(([v, label]) => (
              <button key={v} onClick={() => { setPeriod(v); setAnalysis(''); }} style={{
                flex: 1, padding: '9px 4px', borderRadius: 9,
                border: `1px solid ${period === v ? C.blue : C.border}`,
                background: period === v ? C.blue + '18' : 'transparent',
                color: period === v ? C.blue : C.muted,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s'
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Stats preview */}
        <div style={{ background: C.card2, borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.muted }}>
          {lang === 'he' ? 'מנתח' : 'Analyzing'}: <span style={{ color: C.text, fontWeight: 600 }}>{total} {lang === 'he' ? 'עסקאות' : 'trades'}</span>
          {' + '}<span style={{ color: C.text, fontWeight: 600 }}>{(data.dailyLogs || []).length} {lang === 'he' ? 'רשומות יומיות' : 'daily logs'}</span>
          {' + '}<span style={{ color: C.text, fontWeight: 600 }}>{(data.weeklyPlans || []).length} {lang === 'he' ? 'סיכומים שבועיים' : 'weekly reviews'}</span>
        </div>

        <Btn onClick={runAnalysis} disabled={loading || total === 0} color={C.accent}>
          {loading
            ? (lang === 'he' ? '🔄 מנתח את הנתונים שלך...' : '🔄 Analyzing your data...')
            : (lang === 'he' ? '🤖 הפעל ניתוח AI' : '🤖 Run AI Analysis')}
        </Btn>

        {total === 0 && (
          <div style={{ color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            {lang === 'he' ? 'הוסף עסקאות כדי לקבל ניתוח' : 'Add trades to get analysis'}
          </div>
        )}
      </Card>

      {error && (
        <Card style={{ borderColor: C.red + '44', background: '#0f0808' }}>
          <div style={{ color: C.red, fontSize: 14 }}>{error}</div>
        </Card>
      )}

      {loading && (
        <Card style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <div style={{ color: C.accent, fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {lang === 'he' ? 'המאמן שלך עובד...' : 'Your coach is working...'}
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            {lang === 'he' ? 'עובר על העסקאות, ההערות והיומן שלך' : 'Going through your trades, notes and journal'}
          </div>
        </Card>
      )}

      {analysis && !loading && (
        <Card style={{ borderColor: C.accent + '33' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle>
              {lang === 'he' ? '📋 ניתוח המאמן שלך' : '📋 Your Coach Analysis'}
            </SectionTitle>
            <button onClick={() => setAnalysis('')} style={{
              background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.muted, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12
            }}>✕ נקה</button>
          </div>
          <MarkdownRenderer text={analysis} />
          <div style={{ marginTop: 20, padding: '10px 14px', background: C.card2, borderRadius: 9, color: C.muted, fontSize: 11, textAlign: 'center' }}>
            {lang === 'he'
              ? 'ניתוח זה מבוסס על הנתונים שהזנת. השתמש בו כנקודת התייחסות, לא כייעוץ פיננסי.'
              : 'This analysis is based on the data you entered. Use it as a reference point, not financial advice.'}
          </div>
        </Card>
      )}
    </div>
  );
}
