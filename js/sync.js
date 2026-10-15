// SYNC: pushes unsynced sets to your Google Sheet. IndexedDB stays the source of truth.
// The URL and secret live in this phone's localStorage, never in the repo.
import * as db from "./db.js";

const cfg = () => ({ url: localStorage.getItem("syncUrl"), secret: localStorage.getItem("syncSecret") });
let busy = false;

export async function syncNow() {
  const { url, secret } = cfg();
  if (!url || !navigator.onLine || busy) return { ok: false, msg: !url ? "Not configured" : "Offline or busy" };
  busy = true;
  try {
    const sets = await db.getUnsyncedSets();
    if (!sets.length) return { ok: true, msg: "Everything is synced" };
    const type = Object.fromEntries((await db.getAllSessions()).map((s) => [s.id, s.type]));
    const rows = sets.map((s) => ({ ts: s.loggedAt, workout: type[s.sessionId], exercise: s.exercise,
      set: s.setNumber, reps: s.reps, weightKg: s.weightKg }));
    // text/plain avoids a CORS preflight, which Apps Script can't answer
    const res = await fetch(url, { method: "POST", body: JSON.stringify({ secret, rows }) });
    const json = await res.json();
    if (!json.ok) return { ok: false, msg: json.error };
    await db.markSynced(sets.map((s) => s.id));
    return { ok: true, msg: `Uploaded ${sets.length} sets` };
  } catch (err) {
    return { ok: false, msg: "Upload failed, will retry" };
  } finally { busy = false; }
}

export async function renderSettings(el) {
  const c = cfg(), pending = (await db.getUnsyncedSets()).length;
  el.innerHTML = `<header><h1>Sync</h1></header><div class="card">
    <label class="mute">Web app URL</label><input id="u" value="${c.url || ""}" placeholder="https://script.google.com/macros/s/.../exec">
    <label class="mute">Secret</label><input id="k" type="password" value="${c.secret || ""}">
    <button class="log wide" id="save">Save</button></div>
    <p class="mute" id="st">${pending} sets waiting to upload</p><button class="finish" id="go">Sync now</button>`;
  el.querySelector("#save").onclick = () => {
    localStorage.setItem("syncUrl", el.querySelector("#u").value.trim());
    localStorage.setItem("syncSecret", el.querySelector("#k").value.trim());
    el.querySelector("#st").textContent = "Saved";
  };
  el.querySelector("#go").onclick = async () => { el.querySelector("#st").textContent = (await syncNow()).msg; };
}
