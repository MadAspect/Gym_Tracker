// STORAGE: IndexedDB wrapper (the phone's built-in database). Source of truth.
// sessions: { id, type, cycleIndex, startedAt }
// sets:     { id, sessionId, exercise, setNumber, reps, weightKg, loggedAt, synced }
const DB_NAME = "gym-tracker";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
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
