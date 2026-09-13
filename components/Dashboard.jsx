"use client";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { PLAN, slugify } from "../lib/plan";
import MusicPlayer from "./MusicPlayer";

const START_DATE = new Date(2026, 8, 14); // 14 Sept 2026

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dayName(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
function fmtDate(iso) {
  return fromISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatSets(sets) {
  if (!sets || sets.length === 0) return null;
  const str = sets
    .filter((s) => s.weight != null && s.weight !== "")
    .map((s) => `${s.weight}kg×${s.reps ?? "–"}`)
    .join(", ");
  return str || null;
}

export default function Dashboard({ user }) {
  const [tab, setTab] = useState("log");
  const [logs, setLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [nutrition, setNutrition] = useState({ settings: null, weightLogs: [], checklistEntries: [] });
  const [nutritionLoaded, setNutritionLoaded] = useState(false);

  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today < START_DATE ? START_DATE : today;
  });
  const [nutriDate, setNutriDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  async function fetchLogs() {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLogsLoaded(true);
    }
  }
  async function fetchNutrition() {
    try {
      const res = await fetch("/api/nutrition");
      if (res.ok) {
        const data = await res.json();
        setNutrition(data);
      }
    } finally {
      setNutritionLoaded(true);
    }
  }

  useEffect(() => {
    fetchLogs();
    fetchNutrition();
  }, []);

  return (
    <div className="wrap">
      <TopBar user={user} />
      <MusicPlayer />
      <Tabs tab={tab} setTab={setTab} />
      {tab === "log" && (
        <LogView
          logs={logs}
          logsLoaded={logsLoaded}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onSaved={fetchLogs}
        />
      )}
      {tab === "progress" && <ProgressView logs={logs} logsLoaded={logsLoaded} />}
      {tab === "monthly" && (
        <MonthlyView
          nutrition={nutrition}
          nutritionLoaded={nutritionLoaded}
          nutriDate={nutriDate}
          setNutriDate={setNutriDate}
          refresh={fetchNutrition}
        />
      )}
    </div>
  );
}

function TopBar({ user }) {
  return (
    <header className="top">
      <div className="brand">
        IRON<span>LEDGER</span>
      </div>
      <div className="userbar">
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="avatar" referrerPolicy="no-referrer" />
        )}
        <span className="usermail">{user.email}</span>
        <button className="signout" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <nav className="tabs">
      <button className={tab === "log" ? "active" : ""} onClick={() => setTab("log")}>
        Log
      </button>
      <button className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}>
        Progress
      </button>
      <button className={tab === "monthly" ? "active" : ""} onClick={() => setTab("monthly")}>
        Monthly
      </button>
    </nav>
  );
}

function DateBar({ date, setDate }) {
  const iso = toISO(date);
  return (
    <div className="datebar">
      <button
        className="arrow"
        onClick={() =>
          setDate((d) => {
            const nd = new Date(d);
            nd.setDate(nd.getDate() - 1);
            return nd;
          })
        }
      >
        ‹
      </button>
      <div className="center">
        <div className="dayname">{dayName(date)}</div>
        <input
          type="date"
          className="datepick"
          value={iso}
          onChange={(e) => e.target.value && setDate(fromISO(e.target.value))}
        />
      </div>
      <button
        className="arrow"
        onClick={() =>
          setDate((d) => {
            const nd = new Date(d);
            nd.setDate(nd.getDate() + 1);
            return nd;
          })
        }
      >
        ›
      </button>
    </div>
  );
}

function LogView({ logs, logsLoaded, currentDate, setCurrentDate, onSaved }) {
  const iso = toISO(currentDate);
  const dow = currentDate.getDay();
  const plan = PLAN[dow];
  const [inputs, setInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [prs, setPrs] = useState([]);

  useEffect(() => {
    if (!logsLoaded || plan.exercises.length === 0) return;
    const next = {};
    plan.exercises.forEach((ex) => {
      const slug = slugify(ex.name);
      const existing = logs.find((l) => l.exercise === slug && l.date === iso);
      if (existing) {
        next[slug] = existing.sets.map((s) => ({
          weight: s.weight ?? "",
          reps: s.reps ?? "",
        }));
      } else {
        const count = ex.repGoal ? 3 : ex.sets;
        next[slug] = Array.from({ length: count }, () => ({ weight: "", reps: "" }));
      }
    });
    setInputs(next);
    setToast("");
    setPrs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso, logsLoaded, logs]);

  function updateRow(slug, idx, field, value) {
    setInputs((prev) => {
      const rows = prev[slug] ? [...prev[slug]] : [];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, [slug]: rows };
    });
  }
  function addRow(slug) {
    setInputs((prev) => ({ ...prev, [slug]: [...(prev[slug] || []), { weight: "", reps: "" }] }));
  }
  function removeRow(slug, idx) {
    setInputs((prev) => ({ ...prev, [slug]: (prev[slug] || []).filter((_, i) => i !== idx) }));
  }
  function lastBefore(slug) {
    const matches = logs
      .filter((l) => l.exercise === slug && l.date < iso)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    return matches[matches.length - 1] || null;
  }

  function detectPRs(entries) {
    const found = [];
    entries.forEach(({ exercise: slug, sets }) => {
      if (sets.length === 0) return;
      const ex = plan.exercises.find((e) => slugify(e.name) === slug);
      if (!ex) return;
      const priorSessions = logs.filter((l) => l.exercise === slug && l.date < iso);
      if (priorSessions.length === 0) return; // nothing to beat yet — not a PR

      if (ex.repGoal) {
        const newTotal = sets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
        const prevBest = Math.max(
          ...priorSessions.map((s) => s.sets.reduce((sum, x) => sum + (Number(x.reps) || 0), 0))
        );
        if (newTotal > prevBest) {
          found.push({ name: ex.name, detail: `${newTotal} reps (previous best ${prevBest})` });
        }
      } else {
        const newTop = topSetOf(sets);
        if (!newTop) return;
        let prevBest = null;
        priorSessions.forEach((s) => {
          const t = topSetOf(s.sets);
          if (t && (!prevBest || t.w > prevBest.w || (t.w === prevBest.w && t.r > prevBest.r))) {
            prevBest = t;
          }
        });
        if (
          prevBest &&
          (newTop.w > prevBest.w || (newTop.w === prevBest.w && newTop.r > prevBest.r))
        ) {
          found.push({
            name: ex.name,
            detail: `${newTop.w}kg × ${newTop.r} (previous best ${prevBest.w}kg × ${prevBest.r})`,
          });
        }
      }
    });
    return found;
  }

  async function handleSave() {
    setSaving(true);
    setToast("");
    setPrs([]);
    const entries = plan.exercises.map((ex) => {
      const slug = slugify(ex.name);
      const rows = (inputs[slug] || [])
        .filter((r) => r.weight !== "" || r.reps !== "")
        .map((r) => ({
          weight: r.weight === "" ? null : Number(r.weight),
          reps: r.reps === "" ? null : Number(r.reps),
        }));
      return { exercise: slug, sets: rows };
    });
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: iso, entries }),
      });
      if (res.ok) {
        const newPrs = detectPRs(entries);
        setPrs(newPrs);
        setToast(`Logged for ${dayName(currentDate)}`);
        onSaved();
      } else {
        setToast("Something didn't save — try again");
      }
    } catch {
      setToast("Something didn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  if (dow === 0 || plan.exercises.length === 0) {
    return (
      <>
        <DateBar date={currentDate} setDate={setCurrentDate} />
        <div className="rest">
          <div className="big">Rest day</div>Recover — no lifts scheduled today.
        </div>
      </>
    );
  }

  return (
    <>
      <DateBar date={currentDate} setDate={setCurrentDate} />
      {!logsLoaded ? (
        <div className="empty">Loading…</div>
      ) : (
        <div>
          {plan.exercises.map((ex) => {
            const slug = slugify(ex.name);
            const rows = inputs[slug] || [];
            const last = lastBefore(slug);
            const lastStr = last ? formatSets(last.sets) : null;
            const repTotal = ex.repGoal
              ? rows.reduce((sum, r) => sum + (parseInt(r.reps) || 0), 0)
              : null;
            return (
              <div className="card" key={slug}>
                <div className="ex-head">
                  <div>
                    <div className="ex-name">{ex.name}</div>
                    <div className="ex-last">{lastStr ? `Last: ${lastStr}` : "No previous data yet"}</div>
                  </div>
                  <div className="goal-pill">{ex.repGoal ? `Goal: ${ex.repGoal} reps` : `${ex.sets} sets`}</div>
                </div>
                <div className="rowlabels">
                  <div></div>
                  <div>Weight</div>
                  <div>Reps</div>
                  <div></div>
                </div>
                {rows.map((row, idx) => {
                  const lastSet = last?.sets?.[idx];
                  return (
                    <div className="setrow" key={idx}>
                      <div className="idx">{idx + 1}</div>
                      <input
                        type="number"
                        step="0.5"
                        inputMode="decimal"
                        placeholder={lastSet?.weight != null ? String(lastSet.weight) : "kg"}
                        value={row.weight}
                        onChange={(e) => updateRow(slug, idx, "weight", e.target.value)}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={lastSet?.reps != null ? String(lastSet.reps) : "reps"}
                        value={row.reps}
                        onChange={(e) => updateRow(slug, idx, "reps", e.target.value)}
                      />
                      <button className="rm" onClick={() => removeRow(slug, idx)}>
                        ×
                      </button>
                    </div>
                  );
                })}
                <button className="addset" onClick={() => addRow(slug)}>
                  + Add set
                </button>
                {ex.repGoal && (
                  <div className={`rep-total ${repTotal >= ex.repGoal ? "hit" : ""}`}>
                    {repTotal} / {ex.repGoal} reps
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {prs.length > 0 && (
        <div className="pr-banner">
          {prs.map((pr) => (
            <div key={pr.name} className="pr-line">
              🎉 <strong>New PR: {pr.name}</strong> — {pr.detail}
            </div>
          ))}
        </div>
      )}
      <div className="savebar">
        <button className="savebtn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save workout"}
        </button>
        <div className="toast">{toast}</div>
      </div>
    </>
  );
}

function topSetOf(sets) {
  let best = null;
  (sets || []).forEach((s) => {
    const w = Number(s.weight) || 0;
    const r = Number(s.reps) || 0;
    if (w === 0 && r === 0) return;
    if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r };
  });
  return best;
}
function volumeOf(sets) {
  return (sets || []).reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
}
function pctChange(from, to) {
  return from > 0 ? ((to - from) / from) * 100 : to > 0 ? 100 : 0;
}
function deltaClass(p) {
  return p > 0.5 ? "up" : p < -0.5 ? "down" : "flat";
}
function fmtPct(p) {
  return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
}

function ProgressView({ logs, logsLoaded }) {
  const allExercises = useMemo(() => {
    const map = new Map();
    Object.values(PLAN).forEach((day) =>
      day.exercises.forEach((ex) => {
        const slug = slugify(ex.name);
        if (!map.has(slug)) map.set(slug, ex.name);
      })
    );
    return [...map.entries()];
  }, []);
  const [selected, setSelected] = useState(allExercises[0]?.[0] || "");

  const withTop = useMemo(() => {
    return logs
      .filter((l) => l.exercise === selected)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((e) => ({ ...e, top: topSetOf(e.sets), vol: volumeOf(e.sets) }))
      .filter((e) => e.top);
  }, [logs, selected]);

  return (
    <div>
      <select className="progress-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {allExercises.map(([slug, name]) => (
          <option key={slug} value={slug}>
            {name}
          </option>
        ))}
      </select>
      {!logsLoaded ? (
        <div className="empty">Loading…</div>
      ) : withTop.length === 0 ? (
        <div className="empty">
          No entries logged yet for this exercise — log a session on the Log tab and it&rsquo;ll show up here.
        </div>
      ) : (
        <>
          {withTop.length < 2 ? (
            <div className="empty">Log one more session to start seeing your % change.</div>
          ) : (
            (() => {
              const first = withTop[0];
              const latest = withTop[withTop.length - 1];
              const wPct = pctChange(first.top.w, latest.top.w);
              const rPct = pctChange(first.top.r, latest.top.r);
              const vPct = pctChange(first.vol, latest.vol);
              return (
                <>
                  <div className="stat-range">
                    {fmtDate(first.date)} → {fmtDate(latest.date)} · {withTop.length} sessions
                  </div>
                  <div className="stat-grid">
                    <div className="stat-card">
                      <div className="stat-label">Top-set weight</div>
                      <div className="stat-value">
                        {first.top.w} → {latest.top.w}kg
                      </div>
                      <div className={`stat-delta ${deltaClass(wPct)}`}>{fmtPct(wPct)}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Top-set reps</div>
                      <div className="stat-value">
                        {first.top.r} → {latest.top.r}
                      </div>
                      <div className={`stat-delta ${deltaClass(rPct)}`}>{fmtPct(rPct)}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Session volume</div>
                      <div className="stat-value">
                        {Math.round(first.vol)} → {Math.round(latest.vol)}
                      </div>
                      <div className={`stat-delta ${deltaClass(vPct)}`}>{fmtPct(vPct)}</div>
                    </div>
                  </div>
                </>
              );
            })()
          )}
          <table className="hist">
            <tbody>
              <tr>
                <th>Date</th>
                <th>Sets (weight×reps)</th>
                <th>Top set</th>
              </tr>
              {withTop
                .slice()
                .reverse()
                .map((e) => (
                  <tr key={e.date}>
                    <td>{fmtDate(e.date)}</td>
                    <td>{e.sets.map((s) => `${s.weight ?? "–"}×${s.reps ?? "–"}`).join(", ")}</td>
                    <td>
                      {e.top.w || "–"}kg × {e.top.r || "–"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function MonthlyView({ nutrition, nutritionLoaded, nutriDate, setNutriDate, refresh }) {
  const { settings, weightLogs, checklistEntries } = nutrition;
  const [weightInput, setWeightInput] = useState(settings?.weight ?? "");
  const [activity, setActivity] = useState(settings?.activity ?? "moderate");
  const [goal, setGoal] = useState(settings?.goal ?? "maintain");
  const [logWeightInput, setLogWeightInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setWeightInput(settings.weight);
      setActivity(settings.activity);
      setGoal(settings.goal);
    }
  }, [settings]);

  const iso = toISO(nutriDate);
  const checklist =
    checklistEntries.find((c) => c.date === iso) || {
      protein: false,
      calories: false,
      creatine: false,
      water: false,
    };

  async function handleCalc() {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    setSaving(true);
    try {
      await fetch("/api/nutrition/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: w, activity, goal }),
      });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleLogWeight() {
    const v = parseFloat(logWeightInput);
    if (!v || v <= 0) return;
    await fetch("/api/nutrition/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: iso, weight: v }),
    });
    setLogWeightInput("");
    await refresh();
  }

  async function toggleCheck(field) {
    const next = { ...checklist, [field]: !checklist[field] };
    await fetch("/api/nutrition/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: iso,
        protein: next.protein,
        calories: next.calories,
        creatine: next.creatine,
        water: next.water,
      }),
    });
    await refresh();
  }

  const recentWeights = weightLogs
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10);

  const year = nutriDate.getFullYear();
  const month = nutriDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = toISO(new Date());
  const checklistByDate = useMemo(() => {
    const m = {};
    checklistEntries.forEach((c) => {
      m[c.date] = c;
    });
    return m;
  }, [checklistEntries]);

  return (
    <div>
      <div className="card">
        <div className="ex-name" style={{ marginBottom: 10 }}>
          Your numbers
        </div>
        <div className="setup-grid">
          <label>
            Body weight (kg)
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="e.g. 73"
            />
          </label>
          <label>
            Activity level
            <select value={activity} onChange={(e) => setActivity(e.target.value)}>
              <option value="sedentary">Sedentary — little exercise</option>
              <option value="light">Lightly active</option>
              <option value="moderate">Moderately active — regular gym</option>
              <option value="very">Very active — intense training</option>
            </select>
          </label>
          <label>
            Goal
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="loss">Weight loss</option>
              <option value="gain">Weight gain</option>
              <option value="maintain">Maintain weight</option>
            </select>
          </label>
        </div>
        <button className="addset" onClick={handleCalc} disabled={saving} style={{ marginTop: 10 }}>
          {saving ? "Updating…" : "Update targets"}
        </button>
      </div>

      {settings && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Calories/day</div>
            <div className="stat-value">{settings.calories} kcal</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Protein/day</div>
            <div className="stat-value">{settings.protein} g</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Water/day</div>
            <div className="stat-value">{(settings.water / 1000).toFixed(1)} L</div>
          </div>
        </div>
      )}

      <DateBar date={nutriDate} setDate={setNutriDate} />

      <div className="card">
        <div className="ex-name" style={{ marginBottom: 6 }}>
          Log today&rsquo;s weight
        </div>
        <div className="setup-grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
          <label>
            Weight (kg)
            <input
              type="number"
              step="0.1"
              value={logWeightInput}
              onChange={(e) => setLogWeightInput(e.target.value)}
              placeholder="kg"
            />
          </label>
          <button className="addset" style={{ marginTop: 0 }} onClick={handleLogWeight}>
            Log
          </button>
        </div>
      </div>

      <div className="card">
        <div className="ex-name" style={{ marginBottom: 10 }}>
          Daily checklist
        </div>
        <label className="check-row">
          <input type="checkbox" checked={!!checklist.protein} onChange={() => toggleCheck("protein")} />
          <span>Hit protein target {settings ? `(${settings.protein}g)` : ""}</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={!!checklist.calories} onChange={() => toggleCheck("calories")} />
          <span>Hit calorie target {settings ? `(${settings.calories} kcal)` : ""}</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={!!checklist.creatine} onChange={() => toggleCheck("creatine")} />
          <span>Took creatine</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={!!checklist.water} onChange={() => toggleCheck("water")} />
          <span>Hit water intake {settings ? `(${(settings.water / 1000).toFixed(1)}L)` : ""}</span>
        </label>
      </div>

      <div className="ex-name" style={{ margin: "18px 0 8px" }}>
        This month
      </div>
      <div className="month-grid">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const dIso = toISO(new Date(year, month, d));
          const entry = checklistByDate[dIso];
          const count = entry ? ["protein", "calories", "creatine", "water"].filter((k) => entry[k]).length : 0;
          const cls = count === 0 ? "" : count === 4 ? "c4" : count >= 3 ? "c3" : count >= 2 ? "c2" : "c1";
          return (
            <div
              key={dIso}
              className={`month-cell ${cls} ${dIso === todayIso ? "today" : ""}`}
              onClick={() => setNutriDate(fromISO(dIso))}
            >
              <div className="n">{d}</div>
              {count ? `${count}/4` : ""}
            </div>
          );
        })}
      </div>

      {!nutritionLoaded ? (
        <div className="empty">Loading…</div>
      ) : recentWeights.length === 0 ? (
        <div className="empty">No weight entries logged yet.</div>
      ) : (
        <table className="hist">
          <tbody>
            <tr>
              <th>Date</th>
              <th>Weight</th>
            </tr>
            {recentWeights.map((w) => (
              <tr key={w.date}>
                <td>{fmtDate(w.date)}</td>
                <td>{w.weight} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}