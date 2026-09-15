import React, { useMemo, useState } from "react";
import { PAIR_LIST } from "./pairs";
import { EVENT_TYPES, computeBalance, returnOnCapital, costReport, reconcile } from "./accountBalance";

/* ------------------------------------------------------------------
   SettingsScreen — המקור היחיד לאמת על החשבון.
   <SettingsScreen theme={C} trades={trades} events={events}
       settings={s} onSettingsChange={fn} onAddEvent={fn} onDeleteEvent={fn} />

   Supabase:
     account_events (id, date date, type text, amount numeric, note text)
     settings: riskPct, usdjpy, commissionPerLot, defaultPair
   ------------------------------------------------------------------ */

const FALLBACK_THEME = {
  bg: "#0a0711", card: "#150e20", border: "#2b1f3f", accent: "#a855f7",
  green: "#22c55e", red: "#f43f5e", blue: "#38bdf8", purple: "#8b5cf6",
  warn: "#f59e0b", text: "#ece8f5", muted: "#8a7ba5",
};

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const money = (v) => (v < 0 ? "−$" : "$") + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const money2 = (v) => (v < 0 ? "−$" : "$") + Math.abs(v).toFixed(2);

export default function SettingsScreen({
  theme, trades = [], events: extEvents, settings: extSettings,
  onSettingsChange, onAddEvent, onDeleteEvent,
}) {
  const C = { ...FALLBACK_THEME, ...(theme || {}) };

  const [localEvents, setLocalEvents] = useState(extEvents || DEMO_EVENTS);
  const events = extEvents || localEvents;
  const [cfg, setCfg] = useState(
    extSettings || { riskPct: 1, usdjpy: 155, commissionPerLot: 7, defaultPair: "GBPJPY" }
  );
  const set = (k, v) => { const next = { ...cfg, [k]: v }; setCfg(next); onSettingsChange && onSettingsChange(next); };

  const [draft, setDraft] = useState({ type: "deposit", amount: "", date: today(), note: "" });
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState("");

  const B = useMemo(() => computeBalance(events, trades, cfg), [events, trades, cfg]);
  const roc = useMemo(() => returnOnCapital(events, trades, cfg), [events, trades, cfg]);
  const cost = useMemo(() => costReport(trades, cfg), [trades, cfg]);
  const gap = actual !== "" ? reconcile(parseFloat(actual) || 0, events, trades, cfg) : null;

  const addEvent = (preset) => {
    const src = preset || draft;
    const amount = parseFloat(src.amount);
    if (!Number.isFinite(amount) || amount === 0) return;
    const ev = { id: Date.now(), date: src.date || today(), type: src.type, amount, note: (src.note || "").trim() };
    onAddEvent ? onAddEvent(ev) : setLocalEvents((p) => [...p, ev]);
    setDraft({ type: "deposit", amount: "", date: today(), note: "" });
    setOpen(false);
    setActual("");
  };

  const removeEvent = (id) =>
    onDeleteEvent ? onDeleteEvent(id) : setLocalEvents((p) => p.filter((e) => e.id !== id));

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 };
  const h = { fontSize: 15, fontWeight: 700, margin: "0 0 12px" };
  const lbl = { fontSize: 11, color: C.muted, marginBottom: 5, display: "block" };
  const input = {
    width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 9, padding: "9px 10px", color: C.text, fontSize: 15, fontWeight: 600,
    textAlign: "right", outline: "none", fontVariantNumeric: "tabular-nums",
  };

  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div dir="rtl" style={{ background: C.bg, color: C.text, padding: 14, display: "grid", gap: 12,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial" }}>

      {/* יתרה */}
      <div style={{ ...card, borderRight: `3px solid ${C.accent}` }}>
        <div style={{ fontSize: 11, color: C.muted }}>יתרת החשבון</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, margin: "4px 0 2px" }}>{money(B.balance)}</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>מחושב מאירועי החשבון ומעסקאות סגורות</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10,
          paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <Stat C={C} label="הוכנס נטו" value={money(B.netDeposited)} />
          <Stat C={C} label="נוצר במסחר" value={money(B.tradingPnl)} color={B.tradingPnl >= 0 ? C.green : C.red} />
          <Stat C={C} label="תשואה על ההון" value={(roc >= 0 ? "+" : "") + roc.toFixed(1) + "%"}
            color={roc >= 0 ? C.green : C.red} />
        </div>
      </div>

      {/* דוח עלויות */}
      <div style={card}>
        <div style={h}>דוח עלויות</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          <Stat C={C} label="ברוטו" value={money(B.gross)} color={B.gross >= 0 ? C.green : C.red} />
          <Stat C={C} label="עמלות" value={money(B.commission)} />
          <Stat C={C} label="swap" value={money(B.swap)} color={B.swap < 0 ? C.warn : C.text} />
          <Stat C={C} label="נטו" value={money(B.tradingPnl)} color={B.tradingPnl >= 0 ? C.green : C.red} />
        </div>
        {cost.overnight.count > 0 && (
          <div style={{ marginTop: 11, fontSize: 12, color: C.muted, lineHeight: 1.7,
            background: C.bg, padding: "10px 12px", borderRadius: 10 }}>
            {cost.overnight.count} עסקאות הוחזקו לתוך הלילה ועלו <b style={{ color: C.warn }}>{money2(cost.overnight.swap)}</b>.
            {cost.overnight.losers > 0 && ` ${cost.overnight.losers} מהן נסגרו בהפסד.`}
          </div>
        )}
        {cost.costShare != null && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
            העלויות אכלו {cost.costShare.toFixed(1)}% מהרווח הברוטו.
          </div>
        )}
      </div>

      {/* סיכון ועלויות ברוקר */}
      <div style={card}>
        <div style={h}>פרמטרים</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <div>
            <label style={lbl}>סיכון לעסקה (%)</label>
            <input style={{ ...input, color: C.accent }} type="number" step="0.25" inputMode="decimal"
              value={cfg.riskPct} onChange={(e) => set("riskPct", +e.target.value)} />
          </div>
          <div>
            <label style={lbl}>עמלה ללוט ($)</label>
            <input style={input} type="number" step="0.5" inputMode="decimal"
              value={cfg.commissionPerLot} onChange={(e) => set("commissionPerLot", +e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 11 }}>
          <label style={lbl}>זוג ברירת מחדל</label>
          <div style={{ display: "flex", gap: 3, background: C.bg, padding: 3, borderRadius: 9,
            border: `1px solid ${C.border}` }}>
            {PAIR_LIST.map((p) => (
              <button key={p.key} onClick={() => set("defaultPair", p.key)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 700, background: cfg.defaultPair === p.key ? C.accent : "transparent",
                  color: cfg.defaultPair === p.key ? "#fff" : C.muted }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 11 }}>
          <label style={lbl}>שער USDJPY — להמרת פיפס לדולר ב-GBP/JPY בלבד</label>
          <input style={input} type="number" step="0.1" inputMode="decimal"
            value={cfg.usdjpy} onChange={(e) => set("usdjpy", +e.target.value)} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
            פיפ ב-GBP/JPY שווה <b>${(1000 / (cfg.usdjpy || 155)).toFixed(2)}</b> ללוט.
            ב-GBP/USD הוא תמיד $10 ללוט ולא מושפע מהשדה הזה.
          </div>
        </div>

        <div style={{ marginTop: 11, fontSize: 12, color: C.muted, lineHeight: 1.7,
          background: C.bg, padding: "10px 12px", borderRadius: 10 }}>
          ב-{cfg.riskPct}% כל הפסד עולה <b style={{ color: C.text }}>{money(B.balance * cfg.riskPct / 100)}</b>.
          שלושה ברצף: <b style={{ color: C.red }}>{money(B.balance * cfg.riskPct * 3 / 100)}</b>.
        </div>
      </div>

      {/* התאמה לברוקר */}
      <div style={card}>
        <div style={h}>התאמה לברוקר</div>
        <label style={lbl}>היתרה בפועל ב-MT5 ($)</label>
        <input style={input} type="number" inputMode="decimal" value={actual} placeholder={B.balance.toFixed(2)}
          onChange={(e) => setActual(e.target.value)} />
        {gap !== null && (
          <div style={{ marginTop: 11 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 9 }}>
              הפער: <b style={{ color: Math.abs(gap) < 1 ? C.green : C.warn }}>{money2(gap)}</b>
              {Math.abs(gap) < 1 ? " — זניח, אין מה לתקן." : " — בדרך כלל ספרד ועיגולים."}
            </div>
            {Math.abs(gap) >= 1 && (
              <button onClick={() => addEvent({ type: "adjustment", amount: gap, date: today(), note: "התאמה ליתרת הברוקר" })}
                style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: C.accent,
                  color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                רשום תיקון של {money2(gap)}
              </button>
            )}
          </div>
        )}
      </div>

      {/* אירועי חשבון */}
      <div style={card}>
        <div style={{ ...h, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>הפקדות ומשיכות</span>
          <button onClick={() => setOpen((o) => !o)}
            style={{ border: `1px solid ${C.accent}66`, background: C.accent + "1a", color: C.accent,
              borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {open ? "ביטול" : "הוספה"}
          </button>
        </div>

        {open && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 11,
            padding: 12, marginBottom: 12, display: "grid", gap: 9 }}>
            <div style={{ display: "flex", gap: 3, background: C.card, padding: 3, borderRadius: 9 }}>
              {Object.values(EVENT_TYPES).map((t) => (
                <button key={t.key} onClick={() => setDraft({ ...draft, type: t.key })}
                  style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, background: draft.type === t.key ? C.accent : "transparent",
                    color: draft.type === t.key ? "#fff" : C.muted }}>{t.label}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              <div>
                <label style={lbl}>סכום ($){draft.type === "adjustment" ? " — אפשר שלילי" : ""}</label>
                <input style={input} type="number" inputMode="decimal" value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>תאריך</label>
                <input style={input} type="date" value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={lbl}>הערה</label>
              <input style={{ ...input, fontWeight: 400, fontSize: 13 }} value={draft.note}
                placeholder="למשל: הפקדה חודשית" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </div>
            <button onClick={() => addEvent()} style={{ padding: "11px 0", borderRadius: 10, border: "none",
              background: C.accent, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              שמור
            </button>
          </div>
        )}

        {sorted.length ? sorted.map((e) => {
          const t = EVENT_TYPES[e.type] || EVENT_TYPES.deposit;
          const val = e.type === "adjustment" ? e.amount : t.sign * Math.abs(e.amount);
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap" }}>{e.date}{e.note ? " · " + e.note : ""}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: val >= 0 ? C.green : C.red,
                fontVariantNumeric: "tabular-nums" }}>{val >= 0 ? "+" : "−"}${Math.abs(val).toLocaleString()}</div>
              <button onClick={() => removeEvent(e.id)} aria-label="מחיקה"
                style={{ background: "none", border: "none", color: C.muted, fontSize: 17, cursor: "pointer",
                  padding: "0 2px", lineHeight: 1 }}>×</button>
            </div>
          );
        }) : (
          <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "18px 0" }}>
            עוד לא רשמת הפקדה. הוסף את ההפקדה הראשונה כדי שהיתרה תתחיל להתחשב.
          </div>
        )}
      </div>
    </div>
  );
}

const Stat = ({ C, label, value, color }) => (
  <div>
    <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color: color || C.text }}>{value}</div>
  </div>
);

const DEMO_EVENTS = [
  { id: 1, date: "2026-05-04", type: "deposit", amount: 1000, note: "הפקדה ראשונית" },
  { id: 2, date: "2026-07-12", type: "deposit", amount: 500, note: "הפקדה חודשית" },
  { id: 3, date: "2026-08-30", type: "withdrawal", amount: 200, note: "משיכת רווחים" },
];
