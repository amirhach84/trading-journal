import React, { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { sessionOf, SESSIONS } from "./sessions";
import { grossOf, costsOf, netOf, buildBalanceSeries, computeBalance } from "./accountBalance";
import { rContext, fmtR } from "./rMultiple";
import { summarizeLosses } from "./lossReasons";

/* ------------------------------------------------------------------
   AnalysisTab — טאב "ניתוח" (שבועי / חודשי)
   שימוש באפליקציה:
     import { C } from "./theme";
     <AnalysisTab trades={trades} theme={C} />
   ------------------------------------------------------------------ */

const CFG = { maxTradesPerDay: 2 };

// מוזרק מה-props ב-render כדי ש-normalize תדע את העמלה ללוט
let SETTINGS = {};

const FALLBACK_THEME = {
  bg: "#0a0711", card: "#150e20", border: "#2b1f3f", accent: "#a855f7",
  green: "#22c55e", red: "#f43f5e", blue: "#38bdf8", purple: "#8b5cf6",
  warn: "#f59e0b", text: "#ece8f5", muted: "#8a7ba5",
};

/* ---------- נרמול רשומת עסקה (עמיד לשמות שדות שונים) ---------- */
const n = (v) => {
  const x = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

function normalize(t) {
  const date = t.date || t.openDate || (t.openedAt || "").slice(0, 10);
  const time =
    t.time || t.openTime || t.entryTime ||
    (t.openedAt && t.openedAt.length > 12 ? t.openedAt.slice(11, 16) : null);
  const pips = n(t.pips ?? t.resultPips ?? t.netPips ?? t.result);
  const slPips = n(t.slPips ?? t.riskPips ?? t.sl ?? t.stopPips) || null;
  const gross = grossOf(t);
  const costs = costsOf(t, SETTINGS);
  const pnl = netOf(t, SETTINGS);                       // נטו, אחרי swap ועמלה
  const riskUsd = t.riskUsd != null ? n(t.riskUsd) : null;
  const riskPct = t.riskPct != null ? n(t.riskPct)
    : (riskUsd && t.balanceAtEntry ? (riskUsd / n(t.balanceAtEntry)) * 100 : null);
  const dir = (t.direction || t.side || t.type || "").toLowerCase().startsWith("s") ? "sell" : "buy";
  const session = sessionOf(date, time)?.key || null;
  return { ...t, date, time, pips, slPips, gross, costs, pnl, riskUsd, riskPct, dir, session, win: pips > 0 };
}

/* ---------- עזרי תאריך ---------- */
const startOfWeek = (d) => {
  const x = new Date(d + "T00:00:00");
  x.setDate(x.getDate() - x.getDay()); // ראשון
  return x.toISOString().slice(0, 10);
};
const monthKey = (d) => d.slice(0, 7);
const heMonths = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const dayShort = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const ddmm = (d) => d.slice(8, 10) + "." + d.slice(5, 7);

const fmt = (v, d = 1) => (v > 0 ? "+" : "") + v.toFixed(d);
const usd = (v) => (v > 0 ? "+" : "−") + "$" + Math.abs(v).toFixed(0);

export default function AnalysisTab({ trades = DEMO_TRADES, events = DEMO_EVENTS, theme, settings }) {
  const C = { ...FALLBACK_THEME, ...(theme || {}) };
  SETTINGS = settings || {};
  const growth = useMemo(() => buildBalanceSeries(events, trades, settings || {}), [events, trades, settings]);
  const RC = useMemo(() => rContext(trades), [trades]);
  const acct = useMemo(() => computeBalance(events, trades, settings || {}), [events, trades, settings]);
  const [mode, setMode] = useState("month"); // week | month
  const [idx, setIdx] = useState(0);         // 0 = התקופה האחרונה

  const all = useMemo(
    () => trades.map(normalize).filter((t) => t.date).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))),
    [trades]
  );

  const periods = useMemo(() => {
    const keys = [...new Set(all.map((t) => (mode === "week" ? startOfWeek(t.date) : monthKey(t.date))))].sort();
    return keys;
  }, [all, mode]);

  const activeKey = periods[periods.length - 1 - idx];
  const inPeriod = useMemo(
    () => all.filter((t) => (mode === "week" ? startOfWeek(t.date) : monthKey(t.date)) === activeKey),
    [all, mode, activeKey]
  );

  const label = !activeKey ? "—" :
    mode === "week"
      ? `שבוע ${ddmm(activeKey)} – ${ddmm(new Date(new Date(activeKey + "T00:00:00").getTime() + 6 * 864e5).toISOString().slice(0, 10))}`
      : `${heMonths[+activeKey.slice(5, 7) - 1]} ${activeKey.slice(0, 4)}`;

  const S = useMemo(() => computeStats(inPeriod, all), [inPeriod, all]);
  const LS = useMemo(() => summarizeLosses(inPeriod, RC), [inPeriod, RC]);
  const LSall = useMemo(() => summarizeLosses(all, RC), [all, RC]);

  /* ---------- סגנונות ---------- */
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 };
  const h = { fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 10px" };
  const sub = { fontSize: 11, color: C.muted };

  const tip = {
    contentStyle: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, direction: "rtl" },
    labelStyle: { color: C.muted }, itemStyle: { color: C.text }, cursor: { fill: "rgba(255,255,255,0.04)" },
  };

  return (
    <div dir="rtl" style={{ background: "transparent", color: C.text, display: "grid", gap: 14, fontFamily: "inherit" }}>

      {/* מתג תקופה */}
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 10 }}>
        <div style={{ display: "flex", background: C.bg, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
          {[["week", "שבועי"], ["month", "חודשי"]].map(([k, txt]) => (
            <button key={k} onClick={() => { setMode(k); setIdx(0); }}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: mode === k ? C.accent : "transparent", color: mode === k ? "#fff" : C.muted }}>
              {txt}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavBtn C={C} disabled={idx >= periods.length - 1} onClick={() => setIdx((i) => i + 1)}>›</NavBtn>
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 130, textAlign: "center" }}>{label}</span>
          <NavBtn C={C} disabled={idx <= 0} onClick={() => setIdx((i) => i - 1)}>‹</NavBtn>
        </div>
      </div>

      {/* העסקה האחרונה */}
      <div style={{ ...card, borderRight: `3px solid ${S.last && S.last.riskFlag ? C.warn : C.accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={h}>העסקה האחרונה</span>
          <span style={sub}>{S.last ? `${ddmm(S.last.date)} · ${S.last.time || "ללא שעה"}` : ""}</span>
        </div>
        {S.last ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <Metric C={C} label="סיכון בפיפס" value={S.last.slPips ? S.last.slPips.toFixed(0) : "—"} />
              <Metric C={C} label="סיכון בדולר" value={S.last.riskUsd ? "$" + S.last.riskUsd.toFixed(0) : "—"} />
              <Metric C={C} label="% מהחשבון" value={S.last.riskPct != null ? S.last.riskPct.toFixed(2) + "%" : "—"}
                color={S.last.riskFlag ? C.warn : C.text} />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              תוצאה: <b style={{ color: S.last.win ? C.green : C.red }}>{fmt(S.last.pips, 0)} פיפס ({usd(S.last.pnl)})</b>
              {" · "}{S.last.dir === "buy" ? "קנייה" : "מכירה"}
              {S.last.slPips ? ` · ${fmt(S.last.pips / S.last.slPips, 2)}R` : ""}
              {S.avgRisk ? ` · ממוצע הסיכון בתקופה: $${S.avgRisk.toFixed(0)}` : ""}
            </div>
            {S.last.riskFlag && (
              <div style={{ marginTop: 8, fontSize: 12, color: C.warn, background: "rgba(245,158,11,.08)", padding: "7px 10px", borderRadius: 8 }}>
                סיכנת כאן {(S.last.riskUsd / S.avgRisk).toFixed(1)} מהסיכון הרגיל שלך.
              </div>
            )}
          </>
        ) : <div style={sub}>אין עסקאות.</div>}
      </div>

      {/* דוח רווח והפסד */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <Kpi C={C} label="אחוז הצלחה" value={S.count ? S.winRate.toFixed(0) + "%" : "—"} note={`${S.wins}W / ${S.losses}L`}
          color={S.winRate >= 50 ? C.green : S.winRate >= 40 ? C.warn : C.red} big />
        <Kpi C={C} label="נטו" value={S.count ? usd(S.netUsd) : "—"} note={`${fmt(S.netPips, 0)} פיפס`}
          color={S.netUsd >= 0 ? C.green : C.red} big />
        <Kpi C={C} label="עסקאות" value={S.count} note={`${S.tradingDays} ימי מסחר`} big />
        <Kpi C={C} label="פקטור רווח" value={S.pf == null ? "—" : S.pf.toFixed(2)} note="רווח ברוטו ÷ הפסד ברוטו"
          color={S.pf >= 1.5 ? C.green : S.pf >= 1 ? C.warn : C.red} />
        <Kpi C={C} label="תוחלת לעסקה" value={S.count ? usd(S.expectancy) : "—"} note={S.avgR != null ? `${fmt(S.avgR, 2)}R בממוצע` : ""}
          color={S.expectancy >= 0 ? C.green : C.red} />
        <Kpi C={C} label="ירידה מקסימלית" value={S.count ? "−$" + Math.abs(S.maxDD).toFixed(0) : "—"} note="מהשיא בתוך התקופה" color={C.red} />
      </div>

      {/* עקומת הון */}
      <div style={card}>
        <div style={h}>מהלך התקופה</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={S.equity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 10 }} stroke={C.border} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} stroke={C.border} />
            <ReferenceLine y={0} stroke={C.muted} strokeDasharray="4 4" />
            <Tooltip {...tip} formatter={(v) => [usd(v), "מצטבר"]} />
            <Area type="monotone" dataKey="cum" stroke={C.accent} strokeWidth={2} fill="url(#eq)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* עלויות */}
      <div style={card}>
        <div style={h}>ברוטו מול נטו</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          <Metric C={C} label="ברוטו" value={S.count ? usd(S.grossUsd) : "—"} color={S.grossUsd >= 0 ? C.green : C.red} />
          <Metric C={C} label="עמלות" value={S.count ? usd(S.commUsd) : "—"} color={C.muted} />
          <Metric C={C} label="swap" value={S.count ? usd(S.swapUsd) : "—"} color={S.swapUsd < 0 ? C.warn : C.muted} />
          <Metric C={C} label="נטו" value={S.count ? usd(S.netUsd) : "—"} color={S.netUsd >= 0 ? C.green : C.red} />
        </div>
        {S.grossUsd > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
            העלויות אכלו {(Math.abs(S.swapUsd + S.commUsd) / S.grossUsd * 100).toFixed(1)}% מהרווח הברוטו.
          </div>
        )}
      </div>

      {/* סשנים */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={h}>איפה הכסף נעלם — לפי סשן</span>
        </div>
        {S.hasTimes ? (
          <>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={S.bySession} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} stroke={C.border} reversed />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} stroke={C.border} />
                <ReferenceLine y={0} stroke={C.muted} />
                <Tooltip {...tip} formatter={(v) => [usd(v), "נטו"]} />
                <Bar dataKey="net" radius={[6, 6, 0, 0]}>
                  {S.bySession.map((s, i) => <Cell key={i} fill={s.net >= 0 ? C.green : C.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 6 }}>
              <thead>
                <tr style={{ color: C.muted }}>
                  {["סשן", "עסקאות", "% הצלחה", "נטו", "תוחלת"].map((x) => (
                    <th key={x} style={{ textAlign: "right", padding: "6px 4px", fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {S.bySession.map((s) => (
                  <tr key={s.key} style={{ background: s.key === S.worstSession?.key ? "rgba(244,63,94,.07)" : "transparent" }}>
                    <td style={{ padding: "7px 4px", fontWeight: 700 }}>{s.name}</td>
                    <td style={{ padding: "7px 4px", color: C.muted }}>{s.count}</td>
                    <td style={{ padding: "7px 4px" }}>{s.count ? s.winRate.toFixed(0) + "%" : "—"}</td>
                    <td style={{ padding: "7px 4px", color: s.net >= 0 ? C.green : C.red, fontWeight: 700 }}>{usd(s.net)}</td>
                    <td style={{ padding: "7px 4px", color: C.muted }}>{s.count ? usd(s.net / s.count) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ ...sub, lineHeight: 1.7 }}>
            אין שעת כניסה בעסקאות, ולכן אי אפשר לפלח לפי סשן. הוסף שדה <code>time</code> (HH:MM) בטופס הכניסה — הפילוח יופיע אוטומטית.
          </div>
        )}
      </div>

      {/* כיוון + יום בשבוע */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={card}>
          <div style={h}>כיוון</div>
          {S.byDir.map((d) => (
            <div key={d.key} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>{d.name} <span style={{ color: C.muted }}>({d.count})</span></span>
                <b style={{ color: d.net >= 0 ? C.green : C.red }}>{usd(d.net)}</b>
              </div>
              <Bar100 C={C} pct={d.winRate} color={d.winRate >= 50 ? C.green : C.red} />
              <div style={{ ...sub, marginTop: 3 }}>{d.count ? d.winRate.toFixed(0) + "% הצלחה" : "—"}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={h}>לפי יום</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={S.byDay} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 10 }} stroke={C.border} reversed />
              <YAxis tick={{ fill: C.muted, fontSize: 9 }} stroke={C.border} />
              <ReferenceLine y={0} stroke={C.muted} />
              <Tooltip {...tip} formatter={(v) => [usd(v), "נטו"]} />
              <Bar dataKey="net" radius={[5, 5, 0, 0]}>
                {S.byDay.map((d, i) => <Cell key={i} fill={d.net >= 0 ? C.green : C.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* משמעת */}
      <div style={card}>
        <div style={h}>משמעת בתקופה</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          <Metric C={C} label={`ימים מעל ${CFG.maxTradesPerDay} עסקאות`} value={S.overDays.length}
            color={S.overDays.length ? C.red : C.green} />
          <Metric C={C} label="עסקאות חריגות" value={S.overTrades} color={S.overTrades ? C.red : C.green} />
          <Metric C={C} label="נטו בימים חריגים" value={S.overDays.length ? usd(S.overNet) : "—"}
            color={S.overNet >= 0 ? C.green : C.red} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          בלי הימים החריגים התקופה נסגרת על <b style={{ color: (S.netUsd - S.overNet) >= 0 ? C.green : C.red }}>{usd(S.netUsd - S.overNet)}</b>.
        </div>
      </div>

      {/* צמיחת החשבון */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
          <span style={h}>צמיחת החשבון</span>
          <span style={sub}>מאז ההתחלה</span>
        </div>
        <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 11, color: C.muted }}>
          <Dot C={C} color={C.accent}>יתרה {usd(acct.balance).replace("+", "")}</Dot>
          <Dot C={C} color={C.blue}>הוכנס {usd(acct.netDeposited).replace("+", "")}</Dot>
        </div>
        <ResponsiveContainer width="100%" height={165}>
          <AreaChart data={growth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="grw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accent} stopOpacity={0.4} />
                <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={ddmm} tick={{ fill: C.muted, fontSize: 10 }}
              stroke={C.border} minTickGap={28} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} stroke={C.border} />
            <Tooltip {...tip} labelFormatter={(d) => d}
              formatter={(v, k) => [usd(v).replace("+", ""), k === "balance" ? "יתרה" : "הוכנס"]} />
            <Area type="stepAfter" dataKey="deposited" stroke={C.blue} strokeWidth={1.5}
              strokeDasharray="5 4" fill="none" dot={false} />
            <Area type="monotone" dataKey="balance" stroke={C.accent} strokeWidth={2} fill="url(#grw)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          הפער בין הקווים הוא כל מה שייצרת:{" "}
          <b style={{ color: acct.tradingPnl >= 0 ? C.green : C.red }}>{usd(acct.tradingPnl)}</b>
          {acct.netDeposited > 0 && ` · תשואה של ${(acct.tradingPnl / acct.netDeposited * 100).toFixed(1)}% על ההון`}
        </div>
      </div>

      {/* מאיפה ההפסדים */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
          <span style={h}>מאיפה ההפסדים</span>
          <span style={sub}>{LS.losses} הפסדים בתקופה</span>
        </div>

        {LS.tagged === 0 ? (
          <div style={{ ...sub, lineHeight: 1.7, marginTop: 8 }}>
            אף הפסד בתקופה הזו לא תויג עדיין. בסגירת עסקה מפסידה תתבקש לבחור סיבה,
            ואפשר להשלים הפסדים ישנים דרך טאב היסטוריה.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "10px 0 14px" }}>
              <div style={{ background: C.green + "12", border: `1px solid ${C.green}33`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: C.muted }}>הפסדים תקינים</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.green }}>{LS.cleanCount}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtR(LS.cleanR, 1)}</div>
              </div>
              <div style={{ background: C.red + "12", border: `1px solid ${C.red}33`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: C.muted }}>טעויות</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.red }}>{LS.errorCount}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtR(LS.errorR, 1)}</div>
              </div>
            </div>

            {LS.rows.map((r) => {
              const worst = Math.abs(LS.rows[0]?.totalR || 1);
              const pct = Math.min(100, (Math.abs(r.totalR) / worst) * 100);
              const col = r.error ? C.red : C.green;
              return (
                <div key={r.id} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span>{r.label} <span style={{ color: C.muted }}>({r.count})</span></span>
                    <b style={{ color: col }}>{fmtR(r.totalR, 1)}</b>
                  </div>
                  <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}

            {LS.errorR < 0 && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.8,
                background: C.bg, padding: "10px 12px", borderRadius: 10 }}>
                בלי הטעויות התקופה נסגרת על{" "}
                <b style={{ color: (S.netPips / (RC.fallbackSl || 35)) - LS.errorR >= 0 ? C.green : C.red }}>
                  {fmtR(RC.sum(inPeriod) - LS.errorR, 1)}
                </b>{" "}
                במקום {fmtR(RC.sum(inPeriod), 1)}.
              </div>
            )}

            {LS.untagged > 0 && (
              <div style={{ ...sub, marginTop: 10 }}>
                {LS.untagged} הפסדים בתקופה עוד לא תויגו — הם לא נספרים כאן.
                {LSall.untagged > LS.untagged && ` (${LSall.untagged} בסך הכל)`}
              </div>
            )}
          </>
        )}
      </div>

      {/* תובנות */}
      <div style={{ ...card, background: "linear-gradient(180deg, rgba(168,85,247,.10), rgba(168,85,247,.02))" }}>
        <div style={h}>מה המספרים אומרים</div>
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.9 }}>
          {S.insights.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* ---------- רכיבי עזר ---------- */
const NavBtn = ({ C, children, ...p }) => (
  <button {...p} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg,
    color: p.disabled ? C.border : C.text, fontSize: 16, cursor: p.disabled ? "default" : "pointer" }}>{children}</button>
);

const Metric = ({ C, label, value, color }) => (
  <div>
    <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: color || C.text }}>{value}</div>
  </div>
);

const Kpi = ({ C, label, value, note, color, big }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 12px" }}>
    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: big ? 22 : 18, fontWeight: 800, color: color || C.text, letterSpacing: -0.5 }}>{value}</div>
    {note && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{note}</div>}
  </div>
);

const Dot = ({ C, color, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
    <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
    {children}
  </span>
);

const Bar100 = ({ C, pct, color }) => (  <div style={{ height: 6, background: C.border, borderRadius: 4, overflow: "hidden" }}>
    <div style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, height: "100%", background: color, borderRadius: 4 }} />
  </div>
);

/* ---------- חישובים ---------- */
function computeStats(list, all) {
  const count = list.length;
  const wins = list.filter((t) => t.win).length;
  const losses = count - wins;
  const netUsd = list.reduce((s, t) => s + t.pnl, 0);
  const grossUsd = list.reduce((s, t) => s + t.gross, 0);
  const swapUsd = list.reduce((s, t) => s + (t.costs?.swap || 0), 0);
  const commUsd = list.reduce((s, t) => s + (t.costs?.commission || 0), 0);
  const overnight = list.filter((t) => (t.costs?.swap || 0) !== 0 || t.heldOvernight);
  const overnightLosers = overnight.filter((t) => t.pnl < 0).length;
  const netPips = list.reduce((s, t) => s + t.pips, 0);
  const gross = list.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(list.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const rs = list.filter((t) => t.slPips).map((t) => t.pips / t.slPips);
  const risks = list.filter((t) => t.riskUsd).map((t) => t.riskUsd);
  const avgRisk = risks.length ? risks.reduce((a, b) => a + b, 0) / risks.length : null;

  const last = all[all.length - 1];
  if (last && avgRisk && last.riskUsd) last.riskFlag = last.riskUsd > avgRisk * 1.4;

  // עקומת הון
  let cum = 0;
  const equity = list.map((t, i) => ({ label: ddmm(t.date), cum: +(cum += t.pnl).toFixed(1), i }));
  let peak = 0, maxDD = 0, run = 0;
  list.forEach((t) => { run += t.pnl; peak = Math.max(peak, run); maxDD = Math.min(maxDD, run - peak); });

  const group = (keyFn, defs) => defs.map((d) => {
    const g = list.filter((t) => keyFn(t) === d.key);
    const w = g.filter((t) => t.win).length;
    return { ...d, count: g.length, wins: w, winRate: g.length ? (w / g.length) * 100 : 0, net: g.reduce((s, t) => s + t.pnl, 0) };
  });

  const bySession = group((t) => t.session, SESSIONS.map((s) => ({ key: s.key, name: s.name })))
    .filter((s) => s.count > 0 || s.key !== "off");
  const byDir = group((t) => t.dir, [{ key: "buy", name: "קנייה" }, { key: "sell", name: "מכירה" }]);
  const byDay = group((t) => new Date(t.date + "T00:00:00").getDay(), dayShort.map((nm, i) => ({ key: i, name: nm })));

  const withTrades = bySession.filter((s) => s.count > 0);
  const worstSession = withTrades.length ? withTrades.reduce((a, b) => (b.net < a.net ? b : a)) : null;

  // ימים חריגים
  const byDate = {};
  list.forEach((t) => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const tradingDays = Object.keys(byDate).length;
  const overDays = Object.entries(byDate).filter(([, g]) => g.length > CFG.maxTradesPerDay);
  const overNet = overDays.reduce((s, [, g]) => s + g.reduce((x, t) => x + t.pnl, 0), 0);
  const overTrades = overDays.reduce((s, [, g]) => s + (g.length - CFG.maxTradesPerDay), 0);

  const winRate = count ? (wins / count) * 100 : 0;
  const pf = grossLoss ? gross / grossLoss : gross ? Infinity : null;
  const expectancy = count ? netUsd / count : 0;
  const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null;

  // תובנות
  const insights = [];
  if (!count) insights.push("אין עסקאות בתקופה הזו.");
  else {
    if (worstSession && worstSession.net < 0)
      insights.push(`הסשן ה${worstSession.name} הוא החור בדלי: ${usd(worstSession.net)} מתוך ${worstSession.count} עסקאות, ${worstSession.winRate.toFixed(0)}% הצלחה.`);
    const bad = byDir.find((d) => d.net < 0 && d.count >= 3);
    if (bad) insights.push(`${bad.name} הפסידה ${usd(bad.net)} ב-${bad.count} עסקאות (${bad.winRate.toFixed(0)}% הצלחה) — בדוק אם זה נגד המגמה היומית.`);
    if (overnight.length) insights.push(`החזקת ${overnight.length} עסקאות לתוך הלילה ושילמת ${usd(swapUsd)} swap. ${overnightLosers} מהן נסגרו בהפסד.`);
    if (overDays.length) insights.push(`${overDays.length} ימים עברת את ${CFG.maxTradesPerDay} העסקאות, ${overTrades} עסקאות מעבר לכלל. הן לבדן שוות ${usd(overNet)}.`);
    if (pf != null && pf < 1) insights.push(`פקטור רווח ${pf.toFixed(2)} — אתה מחזיר יותר ממה שאתה לוקח. בדוק את גודל ההפסד הממוצע לפני שאתה מגדיל סיכון.`);
    if (winRate >= 40 && pf >= 1.5) insights.push("היחס עובד. הבעיה בתקופה הזו היא לא האסטרטגיה אלא היכן ומתי אתה נכנס.");
    const worstDay = byDay.filter((d) => d.count).reduce((a, b) => (b.net < a.net ? b : a), byDay.find((d) => d.count) || byDay[0]);
    if (worstDay && worstDay.net < 0) insights.push(`יום ${worstDay.name} הוא היום הגרוע ביותר בתקופה: ${usd(worstDay.net)} ב-${worstDay.count} עסקאות.`);
  }

  return {
    count, wins, losses, winRate, netUsd, netPips, pf, expectancy, avgR, maxDD,
    grossUsd, swapUsd, commUsd, overnight, overnightLosers,
    equity, bySession, byDir, byDay, worstSession, tradingDays, overDays, overNet, overTrades,
    last, avgRisk, insights, hasTimes: list.some((t) => t.time),
  };
}

/* ---------- נתוני דמו (מוחלפים ב-trades האמיתיים) ---------- */
// [תאריך, שעה, כיוון, פיפס תוצאה, פיפס סטופ]
const RAW = [
  ["2026-08-03","12:10","sell",44,22],["2026-08-03","15:40","buy",-22,22],
  ["2026-08-04","11:20","sell",38,19],["2026-08-05","04:30","buy",-26,26],
  ["2026-08-05","05:10","buy",-24,24],["2026-08-05","06:00","buy",-31,31],
  ["2026-08-06","12:45","sell",40,20],["2026-08-07","17:05","sell",-20,20],
  ["2026-08-10","11:35","sell",46,23],["2026-08-10","16:20","buy",-23,23],
  ["2026-08-11","03:50","buy",-28,28],["2026-08-11","12:15","sell",42,21],
  ["2026-08-12","13:00","sell",-21,21],["2026-08-12","13:55","sell",-22,22],
  ["2026-08-12","14:40","buy",-35,35],["2026-08-13","11:10","sell",44,22],
  ["2026-08-14","16:45","buy",36,18],["2026-08-17","12:05","sell",48,24],
  ["2026-08-18","04:20","buy",-27,27],["2026-08-18","11:50","sell",-24,24],
  ["2026-08-19","12:30","sell",44,22],["2026-08-20","17:15","buy",34,17],
  ["2026-08-21","11:25","sell",-23,23],["2026-08-24","12:40","sell",50,25],
  ["2026-08-25","05:30","buy",-30,30],["2026-08-26","11:45","sell",40,20],
  ["2026-08-27","16:10","buy",-19,19],["2026-08-28","12:20","sell",46,23],
  ["2026-08-31","13:10","sell",-22,22],
  ["2026-09-01","11:40","sell",42,21],["2026-09-01","15:20","buy",-21,21],
  ["2026-09-02","04:10","buy",-25,25],["2026-09-02","12:35","sell",44,22],
  ["2026-09-03","16:50","buy",38,19],["2026-09-04","11:15","sell",-23,23],
  ["2026-09-07","12:25","sell",48,24],["2026-09-08","03:40","buy",-29,29],
  ["2026-09-08","11:55","sell",-22,22],["2026-09-08","12:50","buy",-26,26],
  ["2026-09-09","13:05","sell",46,23],["2026-09-10","17:00","buy",36,18],
  ["2026-09-11","11:30","sell",-24,24],["2026-09-14","12:15","sell",52,26],
  ["2026-09-15","05:05","buy",-33,44],
];
const DEMO_TRADES = RAW.map(([date, time, direction, pips, slPips], i) => ({
  id: i + 1, date, time, direction, pips, slPips, pair: "GBPJPY",
  lots: +(10 / (slPips * 6.45)).toFixed(2),   // 1% מ-$1000
  pipValueAtEntry: 6.45,
  balanceAtEntry: 1000,
  swap: i % 7 === 0 ? -1.8 : 0,
  commission: -0.6,
}));

const DEMO_EVENTS = [
  { id: 1, date: "2026-05-04", type: "deposit", amount: 1000, note: "הפקדה ראשונית" },
  { id: 2, date: "2026-07-12", type: "deposit", amount: 500, note: "הפקדה חודשית" },
  { id: 3, date: "2026-08-30", type: "withdrawal", amount: 200, note: "משיכת רווחים" },
];
