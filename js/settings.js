// UI: settings page. Routine editor, exercise library, sync, backup, delete workout.
import * as db from "./db.js";
import { syncNow } from "./sync.js";
import { hold } from "./ui.js";

const DAYS = ["push", "pull", "legs"];
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const date = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
let msgs = {}; // status lines shown right next to the control that caused them
const st = (k) => (msgs[k] ? `<p class="status ${msgs[k].ok ? "ok" : "err"}">${msgs[k].text}</p>` : "");

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

  el.innerHTML = `<header><h1>Settings</h1></header>
    <h3>Routine (✕ moves an exercise to reserve)</h3>${DAYS.map(dayCard).join("")}
    <h3>Exercise library</h3><div class="card"><div class="add" style="margin-top:0"><input id="newex" placeholder="New exercise name"><button class="mini" data-a="new">Add</button></div>${st("lib")}
      <p class="mute">In reserve (${reserve.length})</p><div class="tags">${reserve.map((n) => `<span>${n}</span>`).join("") || `<span class="mute">None</span>`}</div></div>
    <h3>Google Sheets sync</h3><div class="card">
      <label class="mute">Web app URL</label><input id="u" value="${url}" placeholder="https://script.google.com/macros/s/.../exec">
      <label class="mute">Secret</label><input id="k" type="password" value="${secret}">
      <button class="log wide" data-a="save">Save</button><p class="status" id="syncst"></p>
      <p class="mute" id="pend">${pending} sets waiting to upload</p><button class="finish" data-a="sync">Sync now</button></div>
    <h3>Data</h3><div class="card"><button class="finish" style="margin:0" data-a="export">Export backup (JSON)</button>
      ${st("data")}<p class="mute">Delete a workout (hold the button)</p>
      ${sessions.slice(-10).reverse().map((s) => `<div class="del"><span>${date(s.startedAt)}, ${s.type}, ${count[s.id] || 0} sets</span><button class="hold" data-id="${s.id}">Hold to delete</button></div>`).join("") || `<span class="mute">No workouts yet.</span>`}</div>`;

  el.onclick = async (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const { a, d, i, v } = b.dataset, list = routine[d];
    msgs = {};
    if (a === "sets") list[+i].sets = Math.min(6, Math.max(1, list[+i].sets + +v));
    else if (a === "move") { const j = +i + +v; if (j < 0 || j >= list.length) return; [list[+i], list[j]] = [list[j], list[+i]]; }
    else if (a === "rm") list.splice(+i, 1);
    else if (a === "add") { const n = el.querySelector(`select[data-d="${d}"]`).value; if (!n) return; list.push({ name: n, sets: 2 }); }
    else if (a === "new") {
      const name = el.querySelector("#newex").value.replace(/[<>&"']/g, "").trim(); // these characters would break the HTML and the sheet formulas
      if (!name) msgs.lib = { text: "Type a name first", ok: false };
      else if (library.some((n) => n.toLowerCase() === name.toLowerCase())) msgs.lib = { text: "That exercise already exists", ok: false };
      else { await db.addToLibrary(name); syncNow(); msgs.lib = { text: `${name} added to reserve`, ok: true }; }
      return renderSettings(el);
    } else if (a === "save" || a === "sync") {
      if (a === "save") {
        localStorage.setItem("syncUrl", el.querySelector("#u").value.trim());
        localStorage.setItem("syncSecret", el.querySelector("#k").value.trim());
      }
      const line = el.querySelector("#syncst"); // updated in place, right under the buttons
      line.className = "status"; line.textContent = a === "save" ? "Saved. Checking connection..." : "Syncing...";
      const r = await syncNow(true);
      line.className = "status " + (r.ok ? "ok" : "err"); line.textContent = r.msg;
      el.querySelector("#pend").textContent = `${(await db.getUnsyncedSets()).length} sets waiting to upload`;
      return;
    }
    else if (a === "export") {
      const data = { sessions, sets, routine, library };
      const link = Object.assign(document.createElement("a"), { download: `gym-backup-${new Date().toISOString().slice(0, 10)}.json`,
        href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" })) });
      link.click(); msgs.data = { text: "Backup downloaded", ok: true }; return renderSettings(el);
    } else return;
    await db.saveRoutine(routine); // saving flags the routine for the next sync
    syncNow();
    renderSettings(el);
  };
  el.querySelectorAll(".hold").forEach((b) => hold(b, 1500, async () => {
    const id = Number(b.dataset.id);
    await db.deleteSession(id);
    if (Number(localStorage.getItem("activeSession")) === id) localStorage.removeItem("activeSession");
    msgs = { data: { text: "Workout deleted", ok: true } }; syncNow(); renderSettings(el);
  }));
}
