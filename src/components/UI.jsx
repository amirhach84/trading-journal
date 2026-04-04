import { C } from '../theme';

export function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '20px 18px', marginBottom: 16, ...style
    }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <div style={{
      color: C.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
      marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 8,
      textTransform: 'uppercase'
    }}>
      {children}
    </div>
  );
}

export function Check({ label, checked, onChange, danger, sub }) {
  const color = danger ? C.red : C.accent;
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
      <div
        onClick={onChange}
        style={{
          width: 22, height: 22, minWidth: 22, borderRadius: 5,
          border: `2px solid ${checked ? color : C.border}`,
          background: checked ? color + '22' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 1, transition: 'all 0.15s'
        }}
      >
        {checked && <span style={{ color, fontSize: 13, fontWeight: 900 }}>✓</span>}
      </div>
      <div>
        <div style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{label}</div>
        {sub && <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>
    </label>
  );
}

export function Input({ label, value, onChange, type = 'text', placeholder, half }) {
  return (
    <div style={{ marginBottom: 14, flex: half ? 1 : undefined }}>
      {label && <div style={{ color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>{label}</div>}
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: C.card2, border: `1px solid ${C.border}`,
          borderRadius: 9, padding: '11px 13px', color: C.text,
          fontSize: 14, fontFamily: 'inherit', outline: 'none',
          transition: 'border-color 0.15s'
        }}
        onFocus={e => e.target.style.borderColor = C.accent}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>{label}</div>}
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{
          width: '100%', background: C.card2, border: `1px solid ${C.border}`,
          borderRadius: 9, padding: '11px 13px', color: C.text,
          fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical'
        }}
        onFocus={e => e.target.style.borderColor = C.accent}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ color: C.muted, fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>{label}</div>}
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: C.card2, border: `1px solid ${C.border}`,
          borderRadius: 9, padding: '11px 13px', color: C.text,
          fontSize: 14, fontFamily: 'inherit', outline: 'none', appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b6a7a' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center'
        }}
      >
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 9,
            border: `1px solid ${value === opt.value ? opt.color : C.border}`,
            background: value === opt.value ? opt.color + '22' : 'transparent',
            color: value === opt.value ? opt.color : C.muted,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            transition: 'all 0.15s'
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ScoreSlider({ label, value, onChange, leftLabel, rightLabel }) {
  const color = value >= 7 ? C.green : value >= 5 ? C.warn : C.red;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ color: C.muted, fontSize: 13 }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontSize: 18, minWidth: 36, textAlign: 'left' }}>{value}<span style={{ color: C.muted, fontSize: 12 }}>/10</span></span>
      </div>
      <input
        type="range" min="1" max="10" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />
      {(leftLabel || rightLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: C.muted, fontSize: 10 }}>{rightLabel}</span>
          <span style={{ color: C.muted, fontSize: 10 }}>{leftLabel}</span>
        </div>
      )}
    </div>
  );
}

export function Btn({ children, onClick, color, disabled, small }) {
  const c = color || C.accent;
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        background: disabled ? C.border + '44' : c + '18',
        border: `1px solid ${disabled ? C.muted2 : c}`,
        color: disabled ? C.muted : c,
        padding: small ? '9px 18px' : '13px 24px',
        borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: small ? 13 : 15, fontFamily: 'inherit', fontWeight: 600,
        width: small ? undefined : '100%', marginTop: small ? 0 : 6,
        transition: 'all 0.15s'
      }}
    >
      {children}
    </button>
  );
}

export function YesNo({ value, onChange, reverse, na }) {
  const options = na
    ? [['yes', 'כן', reverse ? C.red : C.green], ['no', 'לא', reverse ? C.green : C.red], ['na', 'לא רלוונטי', C.muted]]
    : [['yes', 'כן', reverse ? C.red : C.green], ['no', 'לא', reverse ? C.green : C.red]];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(([v, label, color]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: '9px 0', borderRadius: 9,
          border: `1px solid ${value === v ? color : C.border}`,
          background: value === v ? color + '22' : 'transparent',
          color: value === v ? color : C.muted,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s'
        }}>{label}</button>
      ))}
    </div>
  );
}

export function StatBox({ label, value, unit, color, sub }) {
  return (
    <div style={{
      background: C.card2, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '14px 10px', textAlign: 'center'
    }}>
      <div style={{ color: color || C.text, fontSize: 22, fontWeight: 700 }}>
        {value}<span style={{ fontSize: 13, color: C.muted }}>{unit}</span>
      </div>
      <div style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999,
      background: toast.type === 'ok' ? '#0f2010' : '#1f0808',
      border: `1px solid ${toast.type === 'ok' ? C.green : C.red}`,
      borderRadius: 12, padding: '13px 28px',
      color: toast.type === 'ok' ? C.green : C.red,
      fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
    }}>
      {toast.msg}
    </div>
  );
}
