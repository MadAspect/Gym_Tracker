// UI: calendar tab. A month grid where trained days are tinted by workout type; tap a day for details.
import * as db from "./db.js";
import { workoutMinutes, totalVolume, dayNum, streak } from "./logic.js";

const COLORS = { push: "#ef8a3c", pull: "#7fb99a", legs: "#d8cfba" };
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const now = new Date();
let view = { y: now.getFullYear(), m: now.getMonth() }; // month being shown (m is 0-11)
let sel = "";                                           // selected day, as "year-month-day"

const keyOf = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export async function renderCalendar(el) {
  const [sessions, sets] = await Promise.all([db.getAllSessions(), db.getSetsSince(0)]);
  const by = {};
  sets.forEach((s) => (by[s.sessionId] ??= []).push(s));
  const done = sessions.filter((s) => by[s.id]); // a workout only counts once it has a set
  const onDay = {};
  done.forEach((s) => (onDay[keyOf(s.startedAt)] ??= []).push(s));
  const todayKey = keyOf(Date.now());
  sel ||= todayKey;

  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // weeks start on Monday
  const total = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array(lead).fill(`<span class="day empty"></span>`);
  for (let d = 1; d <= total; d++) {
    const k = `${view.y}-${view.m + 1}-${d}`, list = onDay[k] || [];
    cells.push(`<button class="day ${list.length ? "has" : ""} ${k === todayKey ? "today" : ""} ${k === sel ? "sel" : ""}" data-a="pick" data-k="${k}" style="--c:${COLORS[list[0]?.type] || "transparent"}">${d}
      <span class="dots">${list.map((s) => `<b class="dot" style="background:${COLORS[s.type]}"></b>`).join("")}</span></button>`);
  }

  const days = [...new Set(done.map((s) => dayNum(s.startedAt)))].sort((a, b) => a - b);
  const thisMonth = done.filter((s) => { const d = new Date(s.startedAt); return d.getFullYear() === view.y && d.getMonth() === view.m; }).length;
  const since = days.length ? dayNum(Date.now()) - days.at(-1) : "-";
  const tile = (n, l) => `<div class="tile"><b>${n}</b><span>${l}</span></div>`;

  const [sy, sm, sd] = sel.split("-").map(Number);
  const detail = (onDay[sel] || []).map((s) => {
    const ss = by[s.id], byEx = {};
    ss.forEach((x) => (byEx[x.exercise] ??= []).push(x));
    return `<div class="card"><h2 style="cursor:default"><b class="dot" style="background:${COLORS[s.type]}"></b> ${cap(s.type)}</h2>
      <p class="mute">${ss.length} sets, ${workoutMinutes(ss)} min, ${Math.round(totalVolume(ss))} kg</p>
      <div class="list">${Object.entries(byEx).map(([n, xs]) => `<div><span>${n}</span><span>${xs.sort((a, b) => a.setNumber - b.setNumber).map((x) => `${x.weightKg}×${x.reps}`).join("  ")}</span></div>`).join("")}</div></div>`;
  }).join("") || `<div class="card"><p class="mute" style="margin:0">Rest day. Nothing logged.</p></div>`;

  el.innerHTML = `<header><h1>Calendar</h1></header>
    <div class="stats">${tile(thisMonth, "this month")}${tile(streak(days), "streak")}${tile(since, "days since")}</div>
    <div class="card"><div class="cal-head"><button class="round" data-a="prev" aria-label="Previous month">‹</button>
      <b>${new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b>
      <button class="round" data-a="next" aria-label="Next month">›</button></div>
      <div class="grid">${["M", "T", "W", "T", "F", "S", "S"].map((x) => `<span class="dow">${x}</span>`).join("")}${cells.join("")}</div>
      <div class="legend">${Object.entries(COLORS).map(([t, c]) => `<span><b class="dot" style="background:${c}"></b>${cap(t)}</span>`).join("")}</div></div>
    <h3>${new Date(sy, sm - 1, sd).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</h3>${detail}`;

  el.onclick = (e) => {
    const b = e.target.closest("[data-a]");
    const a = b?.dataset.a;
    if (!["pick", "prev", "next"].includes(a)) return;
    if (a === "pick") sel = b.dataset.k;
    else { const d = new Date(view.y, view.m + (a === "next" ? 1 : -1), 1); view = { y: d.getFullYear(), m: d.getMonth() }; }
    renderCalendar(el);
  };
}
