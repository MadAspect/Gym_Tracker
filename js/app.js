// UI controller: holds screen state, renders HTML, reacts to taps.
import { CYCLE } from "./routine.js";
import { nextCycleIndex, workoutMinutes, newPRs, totalVolume } from "./logic.js";
import * as db from "./db.js";
import { openPad } from "./numpad.js";
import { hold, openSheet } from "./ui.js";
import { renderProgress } from "./progress.js";
import { syncNow } from "./sync.js";
import { renderSettings } from "./settings.js";

const app = document.getElementById("app");
// S = everything the screen needs. prev = last time's values (used to pre-fill).
const S = { session: null, type: "", cycleIndex: 0, sets: [], prev: {}, drafts: {}, focus: 0, all: false, tab: "log", routines: {}, toast: "", summary: "" };
const routine = () => S.routines[S.type] ?? [];
const key = (e, n) => `${e}|${n}`;
const logged = (e, n) => S.sets.find((s) => s.exercise === e && s.setNumber === n);
const cap = (t) => t[0].toUpperCase() + t.slice(1);

// What a set row shows: logged value > unsaved edit > last session's value > empty.
function val(e, n) {
  return logged(e, n) ?? S.drafts[key(e, n)] ??
    (S.prev[key(e, n)] ? { weightKg: S.prev[key(e, n)].weightKg, reps: S.prev[key(e, n)].reps } : { weightKg: "", reps: "" });
}
function firstOpen() {
  const r = routine();
  const i = r.findIndex((x) => Array.from({ length: x.sets }, (_, k) => logged(x.name, k + 1)).some((l) => !l));
  return i < 0 ? r.length : i;
}

async function init() {
  Object.assign(S, { session: null, sets: [], prev: {}, drafts: {}, toast: "", routines: await db.getRoutine() });
  const sid = Number(localStorage.getItem("activeSession"));
  const active = sid ? await db.getSession(sid) : null;
  if (active) {
    Object.assign(S, { session: active, type: active.type, cycleIndex: active.cycleIndex });
    S.sets = await db.getSetsBySession(sid);
  } else {
    S.cycleIndex = nextCycleIndex(await db.getLastSession());
    S.type = CYCLE[S.cycleIndex];
  }
  for (const s of await db.getSetsSince(0)) if (s.sessionId !== S.session?.id) S.prev[key(s.exercise, s.setNumber)] = s;
  S.focus = firstOpen();
  render();
}

const nextOpen = (i) => { const x = routine()[i]; for (let n = 1; n <= x.sets; n++) if (!logged(x.name, n)) return n; return 0; };

function row(i, n) {
  const x = routine()[i], v = val(x.name, n), l = logged(x.name, n);
  const chip = (f, txt) => `<button class="chip" data-a="edit" data-i="${i}" data-n="${n}" data-f="${f}">${txt}</button>`;
  return `<div class="set ${l ? "done" : ""}"><span class="n">${n}</span>
    ${chip("weightKg", v.weightKg === "" ? "kg" : v.weightKg + " kg")}${chip("reps", v.reps === "" ? "reps" : v.reps + " reps")}
    <button class="log" data-a="log" data-i="${i}" data-n="${n}">${l ? "✓" : "Log"}</button></div>`;
}

// Focus view shows ONLY the current set; "All exercises" shows every set of every exercise.
function card(i) {
  const x = routine()[i];
  const n = nextOpen(i) || x.sets;
  const rows = S.all ? Array.from({ length: x.sets }, (_, k) => row(i, k + 1)).join("") : `<p class="mute">Set ${n} of ${x.sets}</p>${row(i, n)}`;
  return `<section class="card ${i === S.focus ? "cur" : ""}"><h2 data-a="focus" data-i="${i}">${x.name}</h2>${rows}</section>`;
}

function render() {
  if (S.tab === "progress") return renderProgress(app);
  if (S.tab === "settings") return renderSettings(app);
  if (!S.session) return renderStart();
  const r = routine(), total = r.reduce((t, x) => t + x.sets, 0);
  const list = S.all ? r.map((_, i) => i) : r[S.focus] ? [S.focus] : [];
  app.innerHTML = `<header><div><h1>${cap(S.type)}</h1>
    <p>${S.sets.length} of ${total} sets${S.sets.length > 1 ? `, ${workoutMinutes(S.sets)} min` : ""}</p></div>
    <span class="hbtns"><button data-a="all">${S.all ? "Focus view" : "All exercises"}</button><button data-a="menu" aria-label="Workout menu">⋯</button></span></header>
    <div class="bar"><i style="width:${(S.sets.length / (total || 1)) * 100}%"></i></div>
    ${S.toast ? `<div class="toast">${S.toast}</div>` : ""}
    ${list.map(card).join("") || `<div class="glass empty">All sets logged.</div>`}`;
}

function edit(i, n, f) {
  const x = routine()[i], v = val(x.name, n);
  openPad({
    title: `${x.name}, set ${n}`, value: v[f], isWeight: f === "weightKg",
    onDone: async (num) => {
      const l = logged(x.name, n);
      if (l) { l[f] = num; await db.updateSet(l); syncNow(); } // logged sets stay editable while the workout is active
      else S.drafts[key(x.name, n)] = { ...v, [f]: num };
      render();
      if (!l && f === "weightKg") edit(i, n, "reps"); // flow straight from weight to reps
    },
  });
}

async function log(i, n, btn) {
  const x = routine()[i];
  if (logged(x.name, n)) return;
  const v = val(x.name, n);
  if (v.weightKg === "" || v.reps === "") return edit(i, n, v.weightKg === "" ? "weightKg" : "reps");
  if (!S.session) return; // sets can only be logged inside a started workout
  const rec = { sessionId: S.session.id, exercise: x.name, setNumber: n, reps: +v.reps, weightKg: +v.weightKg };
  const saved = await db.addSet(rec);
  S.sets.push(saved);
  const prs = newPRs(await db.getSetsSince(0), saved);
  S.toast = prs.length ? `New PR: ${prs.join(", ")}` : "";
  syncNow();
  delete S.drafts[key(x.name, n)];
  if (!S.all && !nextOpen(i)) S.focus = firstOpen(); // exercise finished: load the next one
  if (btn) { btn.textContent = "✓"; btn.classList.add("ok"); navigator.vibrate?.(30); await new Promise((r) => setTimeout(r, 170)); } // visible "registered" flash
  render();
}

function renderStart() {
  const r = routine(), total = r.reduce((t, x) => t + x.sets, 0);
  app.innerHTML = `<header><div><h1>Ready to train?</h1><p>Next up in your cycle</p></div></header>
    ${S.summary ? `<div class="toast">${S.summary}</div>` : ""}
    <section class="card"><h2 style="cursor:default">${cap(S.type)} day</h2><p class="mute">${r.length} exercises, ${total} sets</p>
      <ol class="plan">${r.map((x) => `<li>${x.name}<span>${x.sets} sets</span></li>`).join("")}</ol>
      ${r.length ? `<button class="startbtn" data-a="start">Start workout</button>` : `<p class="mute">Add exercises to this day in Settings first.</p>`}</section>`;
}

async function startWorkout() {
  const id = await db.addSession(S.type, S.cycleIndex);
  localStorage.setItem("activeSession", id);
  Object.assign(S, { session: { id, type: S.type, cycleIndex: S.cycleIndex }, summary: "", all: false, focus: 0 });
  render();
}

// Ending needs two deliberate steps: open the menu and tap End, then HOLD the confirm button.
function endFlow() {
  openSheet(`<div class="pad-top"><span>Workout options</span></div>
    <button class="menu-btn" id="end">End workout</button><button class="finish" id="close">Close</button>`, (sh, close) => {
    sh.querySelector("#close").onclick = close;
    sh.querySelector("#end").onclick = () => {
      sh.innerHTML = `<p class="confirm">End ${cap(S.type)}?<br><span class="mute">${S.sets.length} sets logged. Hold the button to confirm.</span></p>
        <button class="hold big" id="hold">Hold to end workout</button><button class="finish" id="cancel">Keep training</button>`;
      sh.querySelector("#cancel").onclick = close;
      hold(sh.querySelector("#hold"), 1500, async () => { close(); await endWorkout(); });
    };
  });
}

async function endWorkout() {
  const { id } = S.session, sets = S.sets, type = S.type;
  localStorage.removeItem("activeSession");
  let summary = "Empty workout discarded";
  if (sets.length) {
    await db.endSession(id);
    summary = `${cap(type)} done: ${sets.length} sets, ${workoutMinutes(sets)} min, ${totalVolume(sets)} kg lifted`;
  } else await db.deleteSession(id); // an empty workout must not advance your cycle
  await init();
  S.summary = summary;
  render();
}

app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const { a, i, n, f } = b.dataset;
  if (a === "all") { S.all = !S.all; render(); }
  else if (a === "focus") { S.focus = +i; S.all = false; render(); }
  else if (a === "edit") edit(+i, +n, f);
  else if (a === "log") log(+i, +n, b);
  else if (a === "menu") endFlow();
  else if (a === "start") startWorkout();
});
document.getElementById("nav").addEventListener("click", (e) => {
  const t = e.target.closest("[data-tab]");
  if (!t) return;
  S.tab = t.dataset.tab;
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b === t));
  if (S.tab === "log") init(); else render(); // re-read routine and sessions after settings changes
});
window.addEventListener("online", () => syncNow());
init().then(syncNow);

// PWA: work offline, and ask the browser not to evict our saved workouts.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
navigator.storage?.persist?.();
