// UI: settings page. Routine editor, exercise library, sync, backup, delete workout.
import * as db from "./db.js";
import { syncNow } from "./sync.js";

const DAYS = ["push", "pull", "legs"];
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const date = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
let msg = "";

// Press-and-hold: runs fn only if the button stays pressed for ms, so a stray tap can't trigger it.
function hold(btn, ms, fn) {
  let timer;
  const stop = () => { clearTimeout(timer); btn.classList.remove("on"); };
  btn.oncontextmenu = (e) => e.preventDefault();
  btn.onpointerdown = () => { btn.classList.add("on"); timer = setTimeout(() => { stop(); fn(); }, ms); };
  btn.onpointerup = btn.onpointerleave = btn.onpointercancel = stop;
}

export async function renderSettings(el) {
  const [routine, library, sessions, sets] = await Promise.all([db.getRoutine(), db.getLibrary(), db.getAllSessions(), db.getSetsSince(0)]);
  const used = new Set(DAYS.flatMap((d) => routine[d].map((x) => x.name)));
  const reserve = library.filter((n) => !used.has(n));
  const count = {};
  sets.forEach((s) => (count[s.sessionId] = (count[s.sessionId] || 0) + 1));
  const url = localStorage.getItem("syncUrl") || "", secret = localStorage.getItem("syncSecret") || "";
  const pending = (await db.getUnsyncedSets()).length;
  const btn = (a, d, i, v, t) => `<button data-a="${a}" data-d="${d}" data-i="${i}" data-v="${v}">${t}</button>`;

  const dayCard = (d) => `<div class="card"><h2>${cap(d)}</h2>
    ${routine[d].map((x, i) => `<div class="ex"><div>${x.name}</div><div class="ctl">
      <span class="step">${btn("sets", d, i, -1, "−")}<b>${x.sets}</b>${btn("sets", d, i, 1, "+")} <span class="mute">sets</span></span>
      <span class="step">${btn("move", d, i, -1, "↑")}${btn("move", d, i, 1, "↓")}${btn("rm", d, i, 0, "✕")}</span></div></div>`).join("")}
    <div class="add"><select data-d="${d}">${library.filter((n) => !routine[d].some((x) => x.name === n)).map((n) => `<option>${n}</option>`).join("")}</select>
    <button class="mini" data-a="add" data-d="${d}">Add</button></div></div>`;

  el.innerHTML = `<header><h1>Settings</h1></header>${msg ? `<div class="toast">${msg}</div>` : ""}
    <h3>Routine (✕ moves an exercise to reserve)</h3>${DAYS.map(dayCard).join("")}
    <h3>Exercise library</h3><div class="card"><div class="add" style="margin-top:0"><input id="newex" placeholder="New exercise name"><button class="mini" data-a="new">Add</button></div>
      <p class="mute">In reserve (${reserve.length})</p><div class="tags">${reserve.map((n) => `<span>${n}</span>`).join("") || `<span class="mute">None</span>`}</div></div>
    <h3>Google Sheets sync</h3><div class="card">
      <label class="mute">Web app URL</label><input id="u" value="${url}" placeholder="https://script.google.com/macros/s/.../exec">
      <label class="mute">Secret</label><input id="k" type="password" value="${secret}">
      <button class="log wide" data-a="save">Save</button>
      <p class="mute">${pending} sets waiting to upload</p><button class="finish" data-a="sync">Sync now</button></div>
    <h3>Data</h3><div class="card"><button class="finish" style="margin:0" data-a="export">Export backup (JSON)</button>
      <p class="mute">Delete a workout (hold the button)</p>
      ${sessions.slice(-10).reverse().map((s) => `<div class="del"><span>${date(s.startedAt)}, ${s.type}, ${count[s.id] || 0} sets</span><button class="hold" data-id="${s.id}">Hold to delete</button></div>`).join("") || `<span class="mute">No workouts yet.</span>`}</div>`;

  el.onclick = async (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const { a, d, i, v } = b.dataset, list = routine[d];
    msg = "";
    if (a === "sets") list[+i].sets = Math.min(6, Math.max(1, list[+i].sets + +v));
    else if (a === "move") { const j = +i + +v; if (j < 0 || j >= list.length) return; [list[+i], list[j]] = [list[j], list[+i]]; }
    else if (a === "rm") list.splice(+i, 1);
    else if (a === "add") { const n = el.querySelector(`select[data-d="${d}"]`).value; if (!n) return; list.push({ name: n, sets: 2 }); }
    else if (a === "new") {
      const name = el.querySelector("#newex").value.replace(/[<>&"']/g, "").trim(); // these characters would break the HTML and the sheet formulas
      if (!name) return;
      if (library.some((n) => n.toLowerCase() === name.toLowerCase())) msg = "That exercise already exists";
      else { await db.addToLibrary(name); syncNow(); msg = `${name} added to reserve`; }
      return renderSettings(el);
    } else if (a === "save") {
      localStorage.setItem("syncUrl", el.querySelector("#u").value.trim());
      localStorage.setItem("syncSecret", el.querySelector("#k").value.trim());
      msg = "Saved"; return renderSettings(el);
    } else if (a === "sync") { msg = (await syncNow()).msg; return renderSettings(el); }
    else if (a === "export") {
      const data = { sessions, sets, routine, library };
      const link = Object.assign(document.createElement("a"), { download: `gym-backup-${new Date().toISOString().slice(0, 10)}.json`,
        href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" })) });
      link.click(); return;
    } else return;
    await db.saveRoutine(routine); // saving flags the routine for the next sync
    syncNow();
    renderSettings(el);
  };
  el.querySelectorAll(".hold").forEach((b) => hold(b, 1500, async () => {
    const id = Number(b.dataset.id);
    await db.deleteSession(id);
    if (Number(localStorage.getItem("activeSession")) === id) localStorage.removeItem("activeSession");
    msg = "Workout deleted"; syncNow(); renderSettings(el);
  }));
}
