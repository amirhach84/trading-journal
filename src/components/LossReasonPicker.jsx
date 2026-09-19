import { C } from '../theme';
import { LOSS_REASONS, reasonById } from '../lossReasons';

/**
 * בורר סיבת הפסד — תגית אחת, רשימה סגורה.
 * <LossReasonPicker value={form.lossReason} onChange={v => set('lossReason', v)} />
 */
export default function LossReasonPicker({ value, onChange, compact }) {
  const chosen = reasonById(value);

  return (
    <div>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 7, letterSpacing: 0.5 }}>
        סיבת ההפסד — בחר אחת
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {LOSS_REASONS.map((r) => {
          const on = value === r.id;
          const col = r.error ? C.red : C.green;
          return (
            <button
              key={r.id}
              onClick={() => onChange(on ? null : r.id)}
              style={{
                padding: compact ? '6px 10px' : '9px 12px',
                borderRadius: 9,
                border: `1px solid ${on ? col : C.border}`,
                background: on ? col + '22' : 'transparent',
                color: on ? col : C.muted,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: compact ? 11.5 : 13,
                fontWeight: on ? 700 : 400,
                transition: 'all 0.15s',
                textAlign: 'right',
              }}
            >
              {compact ? r.short : r.label}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div style={{
          marginTop: 10, padding: '9px 12px', borderRadius: 9,
          background: (chosen.error ? C.red : C.green) + '11',
          border: `1px solid ${(chosen.error ? C.red : C.green)}33`,
          color: C.text, fontSize: 12.5, lineHeight: 1.7,
        }}>
          {chosen.hint}
          {!chosen.error && (
            <div style={{ color: C.green, fontSize: 11.5, marginTop: 5, fontWeight: 600 }}>
              הפסד כזה לא נספר כטעות בניתוח.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
