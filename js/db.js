import { DEFAULT_ROUTINE } from "./routine.js";
// STORAGE: IndexedDB wrapper (the phone's built-in database). Source of truth.
// sessions: { id, type, cycleIndex, startedAt }
// sets:     { id, sessionId, exercise, setNumber, reps, weightKg, loggedAt, synced }
const DB_NAME = "gym-tracker";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv"); // v2: routine, library, sync flags
      if (ev.oldVersion >= 1) return; // v1 stores already exist
      db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
      const sets = db.createObjectStore("sets", { keyPath: "id", autoIncrement: true });
      sets.createIndex("loggedAt", "loggedAt");
      sets.createIndex("sessionId", "sessionId");
      sets.createIndex("synced", "synced");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Run one request inside a transaction and wait for the result.
async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const addSession = (type, cycleIndex) =>
  run("sessions", "readwrite", (s) => s.add({ type, cycleIndex, startedAt: Date.now() }));

export const getLastSession = async () => {
  const all = await run("sessions", "readonly", (s) => s.getAll());
  return all.at(-1) ?? null;
};

// Returns the full saved record (with id and loggedAt) so the UI and DB never disagree.
export const addSet = async (f) => {
  const rec = { ...f, loggedAt: Date.now(), synced: 0 };
  rec.id = await run("sets", "readwrite", (s) => s.add(rec));
  return rec;
};

// Editing is allowed during a workout (Module 2 will enforce that in the UI).
export const updateSet = (set) => run("sets", "readwrite", (s) => s.put({ ...set, synced: 0 }));

export const getSetsSince = (ts) =>
  run("sets", "readonly", (s) => s.index("loggedAt").getAll(IDBKeyRange.lowerBound(ts)));

export const getSetsBySession = (id) =>
  run("sets", "readonly", (s) => s.index("sessionId").getAll(id));

export const getUnsyncedSets = () =>
  run("sets", "readonly", (s) => s.getAll()).then((all) => all.filter((x) => !x.synced));

export const getSession = (id) => run("sessions", "readonly", (s) => s.get(id));

export const getAllSessions = () => run("sessions", "readonly", (s) => s.getAll());

// Mark as uploaded without resetting the flag (updateSet always sets synced to 0).
export async function markSynced(ids) {
  for (const id of ids) {
    const s = await run("sets", "readonly", (st) => st.get(id));
    if (s) await run("sets", "readwrite", (st) => st.put({ ...s, synced: 1 }));
  }
}

// ---- kv store: small values (routine, exercise library, sync flags) ----
export const getKV = async (k, fallback) => (await run("kv", "readonly", (s) => s.get(k))) ?? fallback;
export const setKV = (k, v) => run("kv", "readwrite", (s) => s.put(v, k));

// Routine = { push: [{name, sets}], pull: [...], legs: [...] }. Seeded from routine.js on first run.
export async function getRoutine() {
  let r = await getKV("routine", null);
  if (!r) { r = structuredClone(DEFAULT_ROUTINE); await saveRoutine(r); }
  return r;
}
export async function saveRoutine(r) { await setKV("routine", r); await setKV("routineDirty", true); }

// Library = every exercise you have ever added. "In reserve" = in the library but not in any day.
export async function getLibrary() {
  let l = await getKV("library", null);
  if (!l) {
    l = [...new Set(Object.values(DEFAULT_ROUTINE).flat().map((x) => x.name))];
    await setKV("library", l); await setKV("routineDirty", true);
  }
  return l;
}
export async function addToLibrary(name) {
  const l = await getLibrary();
  l.push(name); await setKV("library", l); await setKV("routineDirty", true);
}

// Deleting a workout removes it locally and queues its sheet rows for deletion on the next sync.
export async function deleteSession(id) {
  const sets = await getSetsBySession(id);
  await setKV("pendingDeletes", [...(await getKV("pendingDeletes", [])), ...sets.map((x) => x.loggedAt)]);
  for (const x of sets) await run("sets", "readwrite", (st) => st.delete(x.id));
  await run("sessions", "readwrite", (st) => st.delete(id));
}

// Stamp the end time when a workout is ended.
export async function endSession(id) {
  const s = await getSession(id);
  if (s) await run("sessions", "readwrite", (st) => st.put({ ...s, endedAt: Date.now() }));
}
