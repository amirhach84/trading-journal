import React, { useState, useEffect, useCallback } from 'react';
import {
  exportData, importData, getStatus, confirmBlockedSave,
  listSnapshots, getSnapshot, loadRescue, clearRescue,
} from './storage';

/* ------------------------------------------------------------------
   BackupPanel — גיבוי, שחזור וגרסאות
   <BackupPanel theme={C} data={data} save={save} showToast={showToast} />
   ------------------------------------------------------------------ */

const FALLBACK_THEME = {
  bg: '#0a0711', card: '#150e20', border: '#2b1f3f', accent: '#a855f7',
  green: '#22c55e', red: '#f43f5e', warn: '#f59e0b', text: '#ece8f5', muted: '#8a7ba5',
};

const when = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ` +
         `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function BackupPanel({ theme, data, save, showToast }) {
  const C = { ...FALLBACK_THEME, ...(theme || {}) };
  const [status, setStatus] = useState(getStatus());
  const [snaps, setSnaps] = useState(null);
  const [busy, setBusy] = useState(false);
  const rescue = loadRescue();

  useEffect(() => {
    const t = setInterval(() => setStatus(getStatus()), 2000);
    return () => clearInterval(t);
  }, []);

  const loadSnaps = useCallback(async () => {
    setBusy(true);
    setSnaps(await listSnapshots());
    setBusy(false);
  }, []);

  const restore = async (id, count) => {
    if (!window.confirm(
      `לשחזר את הגרסה הזו (${count} עסקאות)? המצב הנוכחי (${data.trades.length} עסקאות) יוחלף.`
    )) return;
    try {
      setBusy(true);
      const snap = await getSnapshot(id);
      save(snap);
      showToast('הגרסה שוחזרה');
    } catch (e) {
      showToast('השחזור נכשל: ' + e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const restoreRescue = () => {
    if (!rescue) return;
    if (!window.confirm(
      `לשחזר את עותק החילוץ (${(rescue.trades || []).length} עסקאות)? המצב הנוכחי יוחלף.`
    )) return;
    save(rescue);
    clearRescue();
    showToast('עותק החילוץ שוחזר');
  };

  const onImport = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    importData(f,
      (parsed) => {
        if (!window.confirm(
          `הקובץ מכיל ${parsed.trades.length} עסקאות. להחליף את המצב הנוכחי (${data.trades.length})?`
        )) return;
        save(parsed);
        showToast('הקובץ נטען');
      },
      (msg) => showToast(msg, 'err')
    );
    e.target.value = '';
  };

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12 };
  const btn = {
    padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
  };

  return (
    <div dir="rtl" style={{ color: C.text, fontFamily: 'inherit' }}>

      {/* מצב הסנכרון */}
      <div style={{ ...card, borderRight: `3px solid ${status.ready ? C.green : C.warn}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>מצב סנכרון</div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <span style={{ color: status.ready ? C.green : C.warn, fontWeight: 700 }}>
            {status.ready ? '● מחובר לשרת' : '● לא מסונכרן'}
          </span>
          <span style={{ color: C.muted }}>
            {' · '}{data.trades.length} עסקאות מקומית
            {status.lastCount ? ` · ${status.lastCount} בשרת` : ''}
          </span>
        </div>
        {!status.ready && (
          <div style={{ marginTop: 9, fontSize: 12, color: C.warn, lineHeight: 1.7,
            background: C.warn + '14', padding: '9px 11px', borderRadius: 9 }}>
            שמירה לשרת חסומה כרגע. העבודה נשמרת מקומית בלבד. רענן את הדף כדי לנסות שוב.
          </div>
        )}
        {status.lastError && (
          <div style={{ marginTop: 9, fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
            {status.lastError}
          </div>
        )}
        {status.blocked && (
          <button onClick={() => { confirmBlockedSave(); showToast('השמירה אושרה'); }}
            style={{ ...btn, background: C.red, color: '#fff', marginTop: 10, width: '100%' }}>
            אשר את השמירה שנחסמה
          </button>
        )}
      </div>

      {/* עותק חילוץ */}
      {rescue && (
        <div style={{ ...card, borderRight: `3px solid ${C.red}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>נמצא עותק חילוץ</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.7, marginBottom: 10 }}>
            בטעינה האחרונה היו במכשיר הזה {(rescue.trades || []).length} עסקאות מול פחות מזה בשרת.
            שמרתי עותק לפני הדריסה.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={restoreRescue}
              style={{ ...btn, background: C.red, color: '#fff', flex: 1 }}>שחזר</button>
            <button onClick={() => exportData(rescue)}
              style={{ ...btn, background: C.bg, color: C.text, border: `1px solid ${C.border}`, flex: 1 }}>
              הורד
            </button>
            <button onClick={() => { clearRescue(); showToast('העותק נמחק'); }}
              style={{ ...btn, background: 'none', color: C.muted }}>מחק</button>
          </div>
        </div>
      )}

      {/* גיבוי ידני */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>גיבוי</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 11 }}>
          הורד קובץ JSON עם כל הנתונים. שמור אותו מחוץ לטלפון — זו הרשת האחרונה.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { exportData(data); showToast('הגיבוי הורד'); }}
            style={{ ...btn, background: C.accent, color: '#fff', flex: 1 }}>
            הורד גיבוי
          </button>
          <label style={{ ...btn, background: C.bg, color: C.text,
            border: `1px solid ${C.border}`, flex: 1, textAlign: 'center' }}>
            טען מקובץ
            <input type="file" accept="application/json,.json" onChange={onImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* גרסאות בשרת */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>גרסאות קודמות</span>
          <button onClick={loadSnaps} disabled={busy}
            style={{ ...btn, padding: '6px 12px', fontSize: 12,
              background: C.accent + '1a', color: C.accent, border: `1px solid ${C.accent}55` }}>
            {busy ? '...' : snaps ? 'רענן' : 'טען'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: snaps ? 11 : 0 }}>
          המערכת שומרת snapshot בשרת עד פעם ב-10 דקות, 30 האחרונים נשמרים.
        </div>

        {snaps && (snaps.length === 0
          ? <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '14px 0' }}>
              עוד אין גרסאות שמורות.
            </div>
          : snaps.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{when(s.created_at)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.trade_count} עסקאות</div>
                </div>
                <button onClick={() => restore(s.id, s.trade_count)} disabled={busy}
                  style={{ ...btn, padding: '6px 12px', fontSize: 12,
                    background: C.bg, color: C.text, border: `1px solid ${C.border}` }}>
                  שחזר
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
