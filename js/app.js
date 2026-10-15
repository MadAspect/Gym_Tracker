// UI controller: holds screen state, renders HTML, reacts to taps.
import { DEFAULT_ROUTINE, CYCLE } from "./routine.js";
import { nextCycleIndex, workoutMinutes } from "./logic.js";
import * as db from "./db.js";
import { openPad } from "./numpad.js";
import { renderProgress } from "./progress.js";

const app = document.getElementById("app");
// S = everything the screen needs. prev = last time's values (used to pre-fill).
const S = { session: null, type: "", cycleIndex: 0, sets: [], prev: {}, drafts: {}, focus: 0, all: false, tab: "log" };
const routine = () => DEFAULT_ROUTINE[S.type];
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
  const r = routine(), total = r.reduce((t, x) => t + x.sets, 0);
  const list = S.all ? r.map((_, i) => i) : r[S.focus] ? [S.focus] : [];
  app.innerHTML = `<header><div><h1>${cap(S.type)}</h1>
    <p>${S.sets.length} of ${total} sets${S.sets.length > 1 ? `, ${workoutMinutes(S.sets)} min` : ""}</p></div>
    <button data-a="all">${S.all ? "Focus view" : "All exercises"}</button></header>
    <div class="bar"><i style="width:${(S.sets.length / total) * 100}%"></i></div>
    ${list.map(card).join("") || `<div class="glass empty">All sets logged.</div>`}
    ${S.session ? `<button class="finish" data-a="finish">Finish workout</button>` : ""}`;
}

function edit(i, n, f) {
  const x = routine()[i], v = val(x.name, n);
  openPad({
    title: `${x.name}, set ${n}`, value: v[f], isWeight: f === "weightKg",
    onDone: async (num) => {
      const l = logged(x.name, n);
      if (l) { l[f] = num; await db.updateSet(l); } // logged sets stay editable while the workout is active
      else S.drafts[key(x.name, n)] = { ...v, [f]: num };
      render();
      if (!l && f === "weightKg") edit(i, n, "reps"); // flow straight from weight to reps
    },
  });
}

async function log(i, n) {
  const x = routine()[i];
  if (logged(x.name, n)) return;
  const v = val(x.name, n);
  if (v.weightKg === "" || v.reps === "") return edit(i, n, v.weightKg === "" ? "weightKg" : "reps");
  if (!S.session) { // the session is created on the first logged set
    const id = await db.addSession(S.type, S.cycleIndex);
    S.session = { id }; localStorage.setItem("activeSession", id);
  }
  const rec = { sessionId: S.session.id, exercise: x.name, setNumber: n, reps: +v.reps, weightKg: +v.weightKg };
  const id = await db.addSet(rec);
  S.sets.push({ ...rec, id, loggedAt: Date.now(), synced: 0 });
  delete S.drafts[key(x.name, n)];
  if (!S.all && !nextOpen(i)) S.focus = firstOpen(); // exercise finished: load the next one
  render();
}

app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const { a, i, n, f } = b.dataset;
  if (a === "all") { S.all = !S.all; render(); }
  else if (a === "focus") { S.focus = +i; S.all = false; render(); }
  else if (a === "edit") edit(+i, +n, f);
  else if (a === "log") log(+i, +n);
  else if (a === "finish") { localStorage.removeItem("activeSession"); location.reload(); }
});
document.getElementById("nav").addEventListener("click", (e) => {
  const t = e.target.closest("[data-tab]");
  if (!t) return;
  S.tab = t.dataset.tab;
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b === t));
  render();
});

init();
