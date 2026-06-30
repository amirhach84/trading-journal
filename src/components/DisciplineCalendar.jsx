import { useState } from 'react';
import { C } from '../theme';
import { Card } from './UI';

const MONTH_NAMES_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
// Grid is rendered in forced LTR (see grid style below) to avoid CSS Grid's RTL auto-mirroring,
// which was misaligning date cells against day-of-week headers. Headers stay in Sun->Sat order
// to match JS Date.getDay() (0=Sun..6=Sat) used for empty-cell padding.
const DAY_NAMES_HE = ['א','ב','ג','ד','ה','ו','ש'];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const today = new Date();
const todayKey = dateKey(today);

export default function DisciplineCalendar({ data, save, showToast }) {
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  const trades = data.trades || [];
  const dailyNotes = data.dailyNotes || {}; // { '2026-06-30': { feeling, note } }

  // Count trades per day
  function tradesForDay(key) {
    return trades.filter(t => t.date === key).length;
  }

  // Score logic: 0 trades = rest day (neutral, extends streak)
  // 1-2 trades = 10/10 (disciplined)
  // 3+ trades = 0/10 (rule broken)
  function dayStatus(key, cellDate) {
    if (cellDate > today) return 'future';
    const count = tradesForDay(key);
    if (count === 0) return 'rest';
    if (count <= 2) return 'win';
    return 'broken';
  }

  // Streak: walk back from today, counting only actual trading days with discipline (status 'win').
  // Rest days (0 trades) are skipped over silently — they don't add to the streak, but don't break it either.
  // A 'broken' day (3+ trades) stops the streak immediately.
  let streak = 0;
  {
    let d = new Date(today);
    let guard = 0;
    while (guard < 730) {
      const k = dateKey(d);
      const status = dayStatus(k, d);
      if (status === 'win') {
        streak++;
        d.setDate(d.getDate() - 1);
        guard++;
      } else if (status === 'rest') {
        d.setDate(d.getDate() - 1); // skip through, no increment
        guard++;
      } else break;
    }
  }

  // Stats: only count days that actually had trades (rest days excluded from win-rate)
  const allDatesWithTrades = [...new Set(trades.map(t => t.date))];
  const winDays = allDatesWithTrades.filter(k => tradesForDay(k) <= 2).length;
  const brokenDays = allDatesWithTrades.filter(k => tradesForDay(k) > 2).length;
  const totalTradeDays = winDays + brokenDays;
  const pct = totalTradeDays > 0 ? Math.round((winDays / totalTradeDays) * 100) : null;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function openDay(key, cellDate) {
    if (cellDate > today) return;
    setSelectedDay({ key, date: cellDate });
    setNoteDraft(dailyNotes[key]?.note || '');
  }

  function saveFeeling(feeling) {
    const key = selectedDay.key;
    const current = dailyNotes[key]?.feeling;
    const nextFeeling = current === feeling ? null : feeling; // click again to deselect
    const next = {
      ...data,
      dailyNotes: {
        ...dailyNotes,
        [key]: { ...(dailyNotes[key] || {}), feeling: nextFeeling, note: dailyNotes[key]?.note || '' },
      },
    };
    save(next);
    showToast(nextFeeling ? '✓ נשמר' : '✓ הוסר');
  }

  function saveNote() {
    const key = selectedDay.key;
    const next = {
      ...data,
      dailyNotes: {
        ...dailyNotes,
        [key]: { ...(dailyNotes[key] || {}), note: noteDraft },
      },
    };
    save(next);
    showToast('✓ ההערה נשמרה');
    setSelectedDay(null);
  }

  const statusColors = {
    win:    { bg: C.green + '22', border: C.green },
    broken: { bg: C.red + '22', border: C.red },
    rest:   { bg: 'transparent', border: C.border },
    future: { bg: 'transparent', border: 'transparent' },
  };

  const statusMark = { win: '✅', broken: '❌', rest: '', future: '' };

  return (
    <div style={{ direction: 'rtl' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.1em', color: C.muted, marginBottom: 6 }}>
            GBPJPY · DISCIPLINE PROTOCOL
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>
            מקסימום <span style={{ color: C.accent }}>2 עסקאות</span> ביום
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.muted, marginTop: 6 }}>
            כל יום נספר אוטומטית מתוך העסקאות שלך
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: C.accent }}>{streak} 🔥</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.muted, marginTop: 2 }}>STREAK</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: C.green }}>{winDays}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.muted, marginTop: 2 }}>ימי משמעת</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: C.text }}>{pct !== null ? pct + '%' : '—'}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.muted, marginTop: 2 }}>אחוז עמידה</div>
          </div>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
          <button onClick={nextMonth} style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, width: 34, height: 34, borderRadius: 6, cursor: 'pointer', fontSize: 16 }}>→</button>
          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, minWidth: 140, textAlign: 'center' }}>
            {MONTH_NAMES_HE[viewMonth]} {viewYear}
          </div>
          <button onClick={prevMonth} style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted, width: 34, height: 34, borderRadius: 6, cursor: 'pointer', fontSize: 16 }}>←</button>
        </div>

        {/* Calendar grid - forced LTR internally so headers/cells never get mirrored by CSS Grid's RTL auto-flip */}
        <div style={{ maxWidth: 400, margin: '0 auto', direction: 'ltr' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
            {DAY_NAMES_HE.map(d => (
              <div key={d} style={{ fontFamily: 'monospace', fontSize: 10, color: C.muted, textAlign: 'center', padding: '3px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const cellDate = new Date(viewYear, viewMonth, day);
              const key = dateKey(cellDate);
              const status = dayStatus(key, cellDate);
              const isToday = key === todayKey;
              const sc = statusColors[status];
              const hasFeeling = !!dailyNotes[key]?.feeling;

              return (
                <div
                  key={day}
                  onClick={() => openDay(key, cellDate)}
                  style={{
                    aspectRatio: '1',
                    background: sc.bg,
                    border: isToday ? `1px solid ${C.accent}` : `1px solid ${sc.border}`,
                    borderRadius: 7,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: status === 'future' ? 'default' : 'pointer',
                    opacity: status === 'future' ? 0.25 : 1,
                    minHeight: 42,
                    position: 'relative',
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: status === 'win' || status === 'broken' ? C.text : C.muted, lineHeight: 1, marginBottom: 2 }}>{day}</span>
                  <span style={{ fontSize: 12, lineHeight: 1 }}>{statusMark[status]}</span>
                  {hasFeeling && (
                    <span style={{ position: 'absolute', top: 2, left: 2, fontSize: 8 }}>📝</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 10, color: C.muted }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: C.green + '22', border: `1px solid ${C.green}` }} /> עד 2 עסקאות
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 10, color: C.muted }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: C.red + '22', border: `1px solid ${C.red}` }} /> הפרת כלל
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 10, color: C.muted }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: 'transparent', border: `1px solid ${C.border}` }} /> יום מנוחה
          </div>
        </div>
      </Card>

      {/* Day detail popup */}
      {selectedDay && (
        <div
          onClick={e => e.target === e.currentTarget && setSelectedDay(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
        >
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, width: 'min(360px, 100%)', direction: 'rtl' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.accent, marginBottom: 4 }}>
              {selectedDay.date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              {tradesForDay(selectedDay.key)} עסקאות באותו יום
              {tradesForDay(selectedDay.key) > 2 && <span style={{ color: C.red }}> — הכלל הופר</span>}
              {tradesForDay(selectedDay.key) === 0 && <span> — יום מנוחה</span>}
            </div>

            <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>איך הרגשת היום?</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['😌 רגוע', '😐 ניטרלי', '😤 מתוח', '😩 לחוץ', '🔥 פרוץ'].map(f => (
                <button
                  key={f}
                  onClick={() => saveFeeling(f)}
                  style={{
                    background: dailyNotes[selectedDay.key]?.feeling === f ? C.accent + '33' : 'transparent',
                    border: `1px solid ${dailyNotes[selectedDay.key]?.feeling === f ? C.accent : C.border}`,
                    color: C.text, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>הערה ליום (אופציונלי)</div>
            <textarea
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="מה עבר עליך היום..."
              style={{
                width: '100%', minHeight: 80, background: '#0a0a0f', border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text, padding: 10, fontFamily: 'inherit', fontSize: 13,
                resize: 'vertical', direction: 'rtl', marginBottom: 14,
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={saveNote}
                style={{ flex: 1, background: C.accent, border: 'none', color: '#0a0a0f', borderRadius: 8, padding: '10px 0', fontWeight: 700, cursor: 'pointer' }}
              >
                שמור
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '10px 0', cursor: 'pointer' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
