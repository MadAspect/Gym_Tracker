// UI: progress tab. Charts are plain SVG, so there's no library and it works offline.
import * as db from "./db.js";
import { DEFAULT_ROUTINE } from "./routine.js";
import { totalVolume, workoutMinutes, estimated1RM, personalBests } from "./logic.js";

const DAY = 864e5;
let ex = ""; // exercise picked in the dropdown

function chart(pts) {
  if (!pts.length) return `<p class="mute">No data yet.</p>`;
  const W = 320, H = 130, p = 34, xs = pts.map((d) => d.t), ys = pts.map((d) => d.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const X = (t) => p + (x1 === x0 ? (W - 2 * p) / 2 : ((t - x0) / (x1 - x0)) * (W - 2 * p));
  const Y = (v) => H - p - (y1 === y0 ? (H - 2 * p) / 2 : ((v - y0) / (y1 - y0)) * (H - 2 * p));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pts.map((d) => `${X(d.t)},${Y(d.y)}`).join(" ")}"/>
    ${pts.map((d) => `<circle cx="${X(d.t)}" cy="${Y(d.y)}" r="3" fill="var(--accent)"/>`).join("")}
    <text x="2" y="${Y(y1) + 4}">${y1}</text><text x="2" y="${Y(y0) + 4}">${y0}</text></svg>`;
}

export async function renderProgress(el) {
  const [sets, sessions] = await Promise.all([db.getSetsSince(0), db.getAllSessions()]);
  const names = [...new Set(Object.values(DEFAULT_ROUTINE).flat().map((x) => x.name))];
  ex ||= names[0];
  const by = {};
  for (const s of sets) (by[s.sessionId] ??= []).push(s);
  const done = sessions.filter((s) => by[s.id]);
  const exPts = done.map((s) => {
    const m = by[s.id].filter((x) => x.exercise === ex).map(estimated1RM);
    return m.length && { t: s.startedAt, y: Math.max(...m) };
  }).filter(Boolean);
  const volPts = done.map((s) => ({ t: s.startedAt, y: Math.round(totalVolume(by[s.id])) }));
  const month = done.filter((s) => s.startedAt > Date.now() - 30 * DAY).reverse();
  const pb = personalBests(sets);
  const date = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  el.innerHTML = `<header><h1>Progress</h1></header>
    <h3>Last 30 days</h3><div class="card list">${month.map((s) => `<div><span>${date(s.startedAt)}, ${s.type}</span>
      <span>${workoutMinutes(by[s.id])} min</span><span>${Math.round(totalVolume(by[s.id]))} kg</span></div>`).join("") || `<span class="mute">No workouts yet.</span>`}</div>
    <h3>Estimated 1RM (kg)</h3><div class="card"><select>${names.map((n) => `<option ${n === ex ? "selected" : ""}>${n}</option>`).join("")}</select>${chart(exPts)}</div>
    <h3>Total volume per workout (kg)</h3><div class="card">${chart(volPts)}</div>
    <h3>Personal records</h3><div class="card list">${names.filter((n) => pb[n]).map((n) => `<div><span>${n}</span><span>${pb[n].maxWeightKg} kg</span><span>1RM ${pb[n].best1RM}</span></div>`).join("") || `<span class="mute">Log a workout first.</span>`}</div>`;
  el.querySelector("select").onchange = (e) => { ex = e.target.value; renderProgress(el); };
}
