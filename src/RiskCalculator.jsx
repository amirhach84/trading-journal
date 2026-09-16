import React, { useMemo, useState } from "react";
import { currentSession } from "./sessions";
import { getPair, PAIR_LIST } from "./pairs";
import { computeBalance } from "./accountBalance";

/* ------------------------------------------------------------------
   RiskCalculator — טאב "לפני"
   <RiskCalculator theme={C} trades={trades} events={events}
       settings={s} onApply={fn} onOpenSettings={fn} />
   היתרה כאן קריאה בלבד — היא מחושבת ונערכת רק במסך ההגדרות.
   ------------------------------------------------------------------ */

const FALLBACK_THEME = {
  bg: "#0a0711", card: "#150e20", border: "#2b1f3f", accent: "#a855f7",
  green: "#22c55e", red: "#f43f5e", blue: "#38bdf8", purple: "#8b5cf6",
  warn: "#f59e0b", text: "#ece8f5", muted: "#8a7ba5",
};

const MIN_RR = 2;
const LOT_STEP = 0.01;
const money = (v) => (v < 0 ? "−$" : "$") + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function RiskCalculator({
  theme, trades = [], events = DEMO_EVENTS, settings, onApply, onOpenSettings,
}) {
  const C = { ...FALLBACK_THEME, ...(theme || {}) };
  const cfg = { riskPct: 1, usdjpy: 155, defaultPair: "GBPJPY", ...(settings || {}) };

  const { balance } = useMemo(() => computeBalance(events, trades, cfg), [events, trades, cfg]);

  const [pairKey, setPairKey] = useState(cfg.defaultPair);
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");

  const pair = getPair(pairKey);
  const r = useMemo(
    () => calc({ entry, sl, tp, pairKey, balance, riskPct: cfg.riskPct, usdjpy: cfg.usdjpy }),
    [entry, sl, tp, pairKey, balance, cfg.riskPct, cfg.usdjpy]
  );
  const ses = currentSession();

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 };
  const h = { fontSize: 15, fontWeight: 700, margin: "0 0 12px" };
  const lbl = { fontSize: 11, color: C.muted, marginBottom: 5, display: "block" };
  const input = {
    width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 9, padding: "9px 10px", color: C.text, fontSize: 15, fontWeight: 600,
    textAlign: "right", outline: "none", fontVariantNumeric: "tabular-nums",
  };

  return (
    <div dir="rtl" style={{ background: "transparent", color: C.text, display: "grid", gap: 12, fontFamily: "inherit" }}>

      {/* שורת מצב: יתרה קריאה בלבד + סשן */}
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px" }}>
        <div>
          <div style={{ fontSize: 10.5, color: C.muted }}>יתרה</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 19, fontWeight: 800 }}>{money(balance)}</span>
            <button onClick={onOpenSettings} style={{ background: "none", border: "none", color: C.muted,
              fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}>הפקדה</button>
          </div>
        </div>
        {ses && (
          <span style={{ fontSize: 11, fontWeight: 700, color: ses.color, background: ses.color + "1a",
            padding: "5px 10px", borderRadius: 20 }}>{ses.full || ses.name}</span>
        )}
      </div>

      {/* זוג */}
      <div style={{ display: "flex", gap: 3, background: C.card, padding: 3, borderRadius: 11,
        border: `1px solid ${C.border}` }}>
        {PAIR_LIST.map((p) => (
          <button key={p.key} onClick={() => { setPairKey(p.key); setEntry(""); setSl(""); setTp(""); }}
            style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, background: pairKey === p.key ? C.accent : "transparent",
              color: pairKey === p.key ? "#fff" : C.muted }}>{p.label}</button>
        ))}
      </div>

      {/* טבלת עזר */}
      <div style={card}>
        <div style={{ ...h, marginBottom: 4 }}>לוט לפי מרחק הסטופ</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 11 }}>
          ב-{cfg.riskPct}% כל הפסד עולה {money(balance * cfg.riskPct / 100)}, לא משנה כמה רחוק הסטופ.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
          {[20, 30, 40, 50, 60].map((p) => {
            const pv = pair.pipValue(cfg.usdjpy);
            const l = Math.max(LOT_STEP, Math.round((balance * cfg.riskPct / 100) / (p * pv) / LOT_STEP) * LOT_STEP);
            const active = r.ready && Math.abs(r.slPips - p) <= 5;
            return (
              <div key={p} style={{ textAlign: "center", padding: "9px 2px", borderRadius: 9,
                background: active ? C.accent + "1f" : C.card, border: `1px solid ${active ? C.accent + "55" : C.border}` }}>
                <div style={{ fontSize: 10, color: C.muted }}>{p} פיפס</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: active ? C.accent : C.text, marginTop: 3 }}>
                  {l.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* מחירים */}
      <div style={card}>
        <div style={h}>הרמות</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
          <div>
            <label style={lbl}>כניסה</label>
            <input style={input} type="number" step={pair.step} inputMode="decimal" placeholder={pair.placeholder}
              value={entry} onChange={(e) => setEntry(e.target.value)} />
          </div>
          <div>
            <label style={{ ...lbl, color: C.red }}>סטופ</label>
            <input style={{ ...input, borderColor: sl ? C.red + "66" : C.border }} type="number" step={pair.step}
              inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value)} />
          </div>
          <div>
            <label style={{ ...lbl, color: C.green }}>מטרה</label>
            <input style={{ ...input, borderColor: tp ? C.green + "66" : C.border }} type="number" step={pair.step}
              inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} />
          </div>
        </div>
        {r.dir && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
            <b style={{ color: r.dir === "buy" ? C.green : C.red }}>{r.dir === "buy" ? "קנייה" : "מכירה"}</b>
            {" · "}סטופ {r.slPips.toFixed(0)} פיפס{r.tpPips ? ` · מטרה ${r.tpPips.toFixed(0)} פיפס` : ""}
          </div>
        )}
      </div>

      {/* התוצאה */}
      {r.ready ? (
        <>
          <div style={{ ...card, borderRight: `3px solid ${r.rrOk ? C.green : C.red}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <Big C={C} label="גודל פוזיציה" value={r.lots.toFixed(2)} unit="לוט" color={C.accent} />
              <Big C={C} label="סיכון" value={money(r.riskUsd)} unit={r.riskPctActual.toFixed(2) + "% מהחשבון"} />
              <Big C={C} label="סיכוי/סיכון" value={r.rr ? r.rr.toFixed(2) + ":1" : "—"}
                unit={r.rrOk ? "עומד בכלל" : `נדרש ${MIN_RR}:1`} color={r.rrOk ? C.green : C.red} />
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
              <div><span style={{ color: C.muted }}>רווח פוטנציאלי: </span>
                <b style={{ color: C.green }}>{r.rewardUsd ? "+" + money(r.rewardUsd) : "—"}</b></div>
              <div><span style={{ color: C.muted }}>שווי פיפ בפוזיציה: </span>
                <b>${(r.pipValue * r.lots).toFixed(2)}</b></div>
            </div>
          </div>

          {!r.rrOk && (
            <Alert C={C} color={C.red}>
              היחס כאן {r.rr ? r.rr.toFixed(2) : "—"}:1. כדי לעמוד ב-{MIN_RR}:1 המטרה צריכה להיות ב-
              <b> {r.requiredTp.toFixed(pair.decimals)}</b> לפחות. אל תקרב את הסטופ כדי להגיע לזה.
            </Alert>
          )}
          {r.lots < 0.01 + 1e-9 && (
            <Alert C={C} color={C.warn}>
              הסטופ רחוק מדי ביחס ליתרה — הלוט המינימלי כבר מסכן {r.riskPctActual.toFixed(2)}%.
              או שתמצא כניסה עם סטופ קצר יותר, או שתוותר על העסקה.
            </Alert>
          )}
          {ses && (ses.key === "asia" || ses.key === "off") && (
            <Alert C={C} color={C.warn}>
              אתה {ses.key === "off" ? "מחוץ לשעות הסשנים" : "בסשן האסייתי"} — החלון שההיסטוריה שלך בו הכי גרועה.
            </Alert>
          )}

          <button onClick={() => onApply && onApply(r.payload)}
            style={{ padding: "13px 0", borderRadius: 12, border: "none", cursor: r.rrOk ? "pointer" : "default",
              fontSize: 15, fontWeight: 800, background: r.rrOk ? C.accent : C.border,
              color: r.rrOk ? "#fff" : C.muted }}>
            שמור את הנתונים לעסקה
          </button>
        </>
      ) : (
        <div style={{ ...card, color: C.muted, fontSize: 13, textAlign: "center", padding: 22 }}>
          הזן מחיר כניסה וסטופ כדי לחשב גודל פוזיציה.
        </div>
      )}
    </div>
  );
}

const Big = ({ C, label, value, unit, color }) => (
  <div>
    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 21, fontWeight: 800, color: color || C.text, letterSpacing: -0.5 }}>{value}</div>
    {unit && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{unit}</div>}
  </div>
);

const Alert = ({ C, color, children }) => (
  <div style={{ background: color + "14", border: `1px solid ${color}3a`, borderRadius: 11,
    padding: "10px 12px", fontSize: 12.5, lineHeight: 1.65, color: C.text }}>{children}</div>
);

/* ---------- החישוב ---------- */
function calc({ entry, sl, tp, pairKey, balance, riskPct, usdjpy }) {
  const pair = getPair(pairKey);
  const pipValue = pair.pipValue(usdjpy);
  const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp);
  if (!Number.isFinite(e) || !Number.isFinite(s) || e === s) return { ready: false, pipValue };

  const dir = s > e ? "sell" : "buy";
  const slPips = Math.abs(e - s) / pair.pip;
  const tpPips = Number.isFinite(t) ? Math.abs(t - e) / pair.pip : null;
  const rr = tpPips ? tpPips / slPips : null;
  const requiredTp = dir === "buy"
    ? e + slPips * MIN_RR * pair.pip
    : e - slPips * MIN_RR * pair.pip;

  const raw = (balance * riskPct / 100) / (slPips * pipValue);
  const lots = Math.max(LOT_STEP, Math.round(raw / LOT_STEP) * LOT_STEP);
  const riskUsd = lots * slPips * pipValue;
  const rewardUsd = tpPips ? lots * tpPips * pipValue : null;

  return {
    ready: true, dir, slPips, tpPips, rr, rrOk: rr != null && rr >= MIN_RR - 0.01, requiredTp,
    lots, riskUsd, rewardUsd, pipValue, riskPctActual: (riskUsd / balance) * 100,
    payload: {
      pair: pair.key, entry: e, sl: s, tp: Number.isFinite(t) ? t : null, direction: dir,
      lots: +lots.toFixed(2), slPips: +slPips.toFixed(1), tpPips: tpPips ? +tpPips.toFixed(1) : null,
      plannedRR: rr ? +rr.toFixed(2) : null,
      riskUsd: +riskUsd.toFixed(2), riskPct: +((riskUsd / balance) * 100).toFixed(3),
      balanceAtEntry: +balance.toFixed(2), pipValueAtEntry: +pipValue.toFixed(4),
      usdjpyAtEntry: pair.needsRate ? usdjpy : null,
    },
  };
}

const DEMO_EVENTS = [{ id: 1, date: "2026-05-04", type: "deposit", amount: 1000, note: "הפקדה ראשונית" }];
