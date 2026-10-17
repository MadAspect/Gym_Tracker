// UI controller: holds screen state, renders HTML, reacts to taps.
import { CYCLE } from "./routine.js";
import { nextCycleIndex, workoutMinutes, newPRs, totalVolume, cycleIndexFor, streak, dayNum } from "./logic.js";
import * as db from "./db.js";
import { openPad } from "./numpad.js";
import { hold, openSheet, icon, enter, hearth } from "./ui.js";
import { artHTML } from "./illustrations.js";
import { renderProgress } from "./progress.js";
let greeting = () => "Ready when you are."; // replaced once theme.js has loaded

// If a secondary screen fails to load, show why instead of leaving a blank page.
function fail(e) {
  app.textContent = "";
  const c = document.createElement("div");
  c.className = "card";
  c.innerHTML = '<h2>Something went wrong</h2><p class="mute"></p><button class="finish" id="reload">Reload</button>';
  c.querySelector("p").textContent = String(e?.message || e);
  c.querySelector("#reload").onclick = () => location.reload();
  app.append(c);
}
import { syncNow } from "./sync.js";

const app = document.getElementById("app");
// S = everything the screen needs. prev = last time's values (used to pre-fill).
const S = { session: null, type: "", cycleIndex: 0, sets: [], prev: {}, drafts: {}, focus: 0, all: false, tab: "log", routines: {}, toast: "", summary: "", media: {}, streak: 0 }
const TABS = ["log", "calendar", "progress", "settings"];
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
  Object.assign(S, { session: null, sets: [], prev: {}, drafts: {}, toast: "", routines: await db.getRoutine(), media: await db.getMedia() });
  const sid = Number(localStorage.getItem("activeSession"));
  const active = sid ? await db.getSession(sid) : null;
  if (active) {
    Object.assign(S, { session: active, type: active.type, cycleIndex: active.cycleIndex });
    S.sets = await db.getSetsBySession(sid);
  } else {
    S.cycleIndex = nextCycleIndex(await db.getLastSession());
    S.type = CYCLE[S.cycleIndex];
  }
  const hist = await db.getSetsSince(0), trained = new Set(hist.map((x) => x.sessionId));
  for (const s of hist) if (s.sessionId !== S.session?.id) S.prev[key(s.exercise, s.setNumber)] = s;
  S.streak = streak([...new Set((await db.getAllSessions()).filter((x) => trained.has(x.id)).map((x) => dayNum(x.startedAt)))].sort((a, b) => a - b));
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

// Focus view: a picture banner with the name on it, then ONLY the current set. "All exercises": compact rows with thumbnails.
function card(i) {
  const x = routine()[i], n = nextOpen(i) || x.sets, img = artHTML(x.name, S.media);
  if (S.all) return `<section class="card ${i === S.focus ? "cur" : ""}"><div class="allhead" data-a="focus" data-i="${i}"><div class="thumb">${img}</div><h2>${x.name}</h2></div>
    ${Array.from({ length: x.sets }, (_, k) => row(i, k + 1)).join("")}</section>`;
  return `<section class="card cur"><div class="art">${img}<div class="cap"><h2>${x.name}</h2><em>Set ${n} of ${x.sets}</em></div></div>${row(i, n)}</section>`;
}

function render() {
  if (S.tab === "progress") return renderProgress(app);
  if (S.tab === "calendar") return import("./calendar.js").then((m) => m.renderCalendar(app)).catch(fail);
  if (S.tab === "settings") return import("./settings.js").then((m) => m.renderSettings(app)).catch(fail);
  if (!S.session) return renderStart();
  const r = routine(), total = r.reduce((t, x) => t + x.sets, 0);
  const list = S.all ? r.map((_, i) => i) : r[S.focus] ? [S.focus] : [];
  app.innerHTML = `<header><div><h1>${cap(S.type)}</h1>
    <p>${S.sets.length} of ${total} sets${S.sets.length > 1 ? `, ${workoutMinutes(S.sets)} min` : ""}</p></div>
    <span class="hbtns"><button class="round ${S.all ? "on" : ""}" data-a="all" aria-label="All exercises">${icon("list")}</button><button class="round" data-a="menu" aria-label="Workout menu">${icon("dots")}</button></span></header>
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
  if (firstOpen() < routine().length) startRest(); else stopRest(); // the log burns down between sets
  if (btn) { btn.textContent = "✓"; btn.classList.add("ok"); navigator.vibrate?.(30); await new Promise((r) => setTimeout(r, 170)); } // visible "registered" flash
  render();
}

// Rest timer: a log that burns down between sets. Lives outside #app so re-renders don't disturb it.
const restEl = document.getElementById("rest");
let rest = null, restTick = 0;
function startRest() {
  const secs = Number(localStorage.getItem("restSecs")) || 90;
  rest = { end: Date.now() + secs * 1000, total: secs * 1000, done: false };
  restEl.innerHTML = `<div class="logbar"><i></i></div><span class="rtxt"></span><button data-r="add">+30s</button><button data-r="x" aria-label="Dismiss">✕</button>`;
  restEl.className = "show";
  clearInterval(restTick); restTick = setInterval(drawRest, 250); drawRest();
}
function stopRest() { rest = null; clearInterval(restTick); restEl.className = ""; }
function drawRest() {
  if (!rest) return;
  const left = rest.end - Date.now();
  if (left <= 0 && !rest.done) { rest.done = true; rest.hideAt = Date.now() + 4000; navigator.vibrate?.([200, 100, 200]); }
  if (rest.done && Date.now() > rest.hideAt) return stopRest();
  const s = Math.max(0, Math.ceil(left / 1000));
  restEl.querySelector("i").style.width = Math.max(0, left / rest.total) * 100 + "%";
  restEl.querySelector(".rtxt").textContent = rest.done ? "Back to the iron" : `Rest ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
restEl.addEventListener("click", (e) => {
  const r = e.target.closest("[data-r]")?.dataset.r;
  if (r === "add" && rest) { rest.end += 30000; rest.total += 30000; rest.done = false; }
  else if (r === "x") stopRest();
});

function renderStart() {
  const r = routine(), total = r.reduce((t, x) => t + x.sets, 0);
  app.innerHTML = `<header><div><p class="brand">FORGE</p><h1>Ready to train?</h1><p>${greeting()}</p></div></header>
    ${hearth(S.streak)}
    ${S.summary ? `<div class="toast">${S.summary}</div>` : ""}
    <div class="pills">${["push", "pull", "legs"].map((d) => `<button class="pill ${d === S.type ? "on" : ""}" data-a="day" data-d="${d}">${cap(d)}</button>`).join("")}</div>
    <p class="mute" style="margin:0 0 10px">${S.type === CYCLE[S.cycleIndex] ? "Suggested by your cycle." : `Your cycle suggests ${cap(CYCLE[S.cycleIndex])}. If you train ${cap(S.type)}, the cycle carries on from there.`}</p>
    <section class="card"><h2 style="cursor:default">${cap(S.type)} day</h2><p class="mute">${r.length} exercises, ${total} sets</p>
      <ol class="plan">${r.map((x) => `<li>${x.name}<span>${x.sets} sets</span></li>`).join("")}</ol>
      ${r.length ? `<button class="startbtn" data-a="start">Start workout</button>` : `<p class="mute">Add exercises to this day in Settings first.</p>`}</section>`;
}

async function startWorkout() {
  const ci = cycleIndexFor(S.type, S.cycleIndex); // the cycle follows what you actually trained
  const id = await db.addSession(S.type, ci);
  localStorage.setItem("activeSession", id);
  Object.assign(S, { session: { id, type: S.type, cycleIndex: ci }, summary: "", all: false, focus: 0 });
  render(); enter(1);
}

// Ending needs two deliberate steps: open the menu and tap End, then HOLD the confirm button.
function endFlow() {
  openSheet(`<div class="pad-top"><span>Workout options</span></div>
    <button class="menu-btn" id="end">End workout</button><button class="finish" id="close">Close</button>`, (sh, close) => {
    sh.querySelector("#close").onclick = close;
    sh.querySelector("#end").onclick = () => {
      sh.innerHTML = `<p class="confirm">End ${cap(S.type)}?<br><span class="mute">${S.sets.length} ${S.sets.length === 1 ? "set" : "sets"} logged. Hold the button to confirm.</span></p>
        <button class="hold big" id="hold">Hold to end workout</button><button class="finish" id="cancel">Keep training</button>`;
      sh.querySelector("#cancel").onclick = close;
      hold(sh.querySelector("#hold"), 1500, async () => { close(); await endWorkout(); });
    };
  });
}

async function endWorkout() {
  stopRest();
  const { id } = S.session, sets = S.sets, type = S.type;
  localStorage.removeItem("activeSession");
  let summary = "Empty workout discarded";
  if (sets.length) {
    await db.endSession(id);
    summary = `${cap(type)} done: ${sets.length} sets, ${workoutMinutes(sets)} min, ${totalVolume(sets)} kg lifted`;
  } else await db.deleteSession(id); // an empty workout must not advance your cycle
  await init();
  S.summary = summary;
  render(); enter(-1);
}

app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const { a, i, n, f, d } = b.dataset;
  if (a === "all") { S.all = !S.all; render(); }
  else if (a === "focus") { S.focus = +i; S.all = false; render(); }
  else if (a === "edit") edit(+i, +n, f);
  else if (a === "log") log(+i, +n, b);
  else if (a === "menu") endFlow();
  else if (a === "start") startWorkout();
  else if (a === "day") { S.type = d; render(); }
});
document.getElementById("nav").addEventListener("click", (e) => {
  const t = e.target.closest("[data-tab]");
  if (!t) return;
  const prev = S.tab;
  S.tab = t.dataset.tab;
  app.onclick = null; app.onchange = null; // drop the previous tab's handlers
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b === t));
  const dir = Math.sign(TABS.indexOf(S.tab) - TABS.indexOf(prev));
  Promise.resolve(S.tab === "log" ? init() : render()).then(() => enter(dir)); // Log re-reads routine and sessions
});
window.addEventListener("online", () => syncNow());
try { const m = await import("./theme.js"); greeting = m.greeting; m.initTheme(); } // the look is optional: Log works without it
catch (e) { console.warn("theme failed to load", e); }
init().then(syncNow).catch(fail);

// PWA: work offline, and ask the browser not to evict our saved workouts.
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
navigator.storage?.persist?.();
