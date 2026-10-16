// SYNC: pushes new/edited sets, deletions and routine changes to your Google Sheet.
// IndexedDB stays the source of truth. URL and secret live in this phone's localStorage only.
import * as db from "./db.js";

const cfg = () => ({ url: localStorage.getItem("syncUrl"), secret: localStorage.getItem("syncSecret") });
let busy = false;

export async function syncNow(force = false) {
  const { url, secret } = cfg();
  if (!url || !navigator.onLine || busy) return { ok: false, msg: !url ? "Add the URL and secret first" : "Offline or busy" };
  busy = true;
  try {
    const sets = await db.getUnsyncedSets();
    const deletes = await db.getKV("pendingDeletes", []);
    const dirty = await db.getKV("routineDirty", false);
    if (!force && !sets.length && !deletes.length && !dirty) return { ok: true, msg: "Everything is synced" };
    const type = Object.fromEntries((await db.getAllSessions()).map((s) => [s.id, s.type]));
    const body = { secret, deletes, rows: sets.map((s) => ({ ts: s.loggedAt, workout: type[s.sessionId], exercise: s.exercise,
      set: s.setNumber, reps: s.reps, weightKg: s.weightKg })) };
    if (dirty) { body.routine = await db.getRoutine(); body.library = await db.getLibrary(); }
    // text/plain avoids a CORS preflight, which Apps Script can't answer
    const json = await (await fetch(url, { method: "POST", body: JSON.stringify(body) })).json();
    if (!json.ok) return { ok: false, msg: json.error === "bad secret" ? "Wrong secret. It must match SECRET in your Apps Script." : json.error };
    await db.markSynced(sets.map((s) => s.id));
    await db.setKV("pendingDeletes", (await db.getKV("pendingDeletes", [])).filter((t) => !deletes.includes(t)));
    if (dirty) await db.setKV("routineDirty", false);
    return { ok: true, msg: sets.length || deletes.length || dirty ? `Synced ${sets.length} sets, ${deletes.length} deletions` : "Connected. Everything is up to date" };
  } catch (err) {
    return { ok: false, msg: force ? "Could not reach the script. Check the URL ends in /exec and access is set to Anyone." : "Upload failed, will retry" };
  } finally { busy = false; }
}
