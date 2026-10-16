// LOGIC: pure functions. No storage, no UI, so they're easy to test and reuse.
import { CYCLE } from "./routine.js";

const KG_PER_LB = 0.45359237;
const round = (n, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

// Weights are ALWAYS stored in kg. Lb is only an input/display convenience.
export const lbToKg = (lb) => round(lb * KG_PER_LB);
export const kgToLb = (kg) => round(kg / KG_PER_LB, 1);

// Which workout is next? Looks at the last session's position in the cycle.
export function nextCycleIndex(lastSession) {
  return lastSession ? (lastSession.cycleIndex + 1) % CYCLE.length : 0;
}

// Workout time = first logged set to last logged set, in minutes.
export function workoutMinutes(sets) {
  if (sets.length < 2) return 0;
  const times = sets.map((s) => s.loggedAt);
  return Math.round((Math.max(...times) - Math.min(...times)) / 60000);
}

export const setVolume = (s) => s.reps * s.weightKg;
export const totalVolume = (sets) => round(sets.reduce((t, s) => t + setVolume(s), 0));

// Epley estimated 1-rep max: a fair way to compare sets with different reps.
export const estimated1RM = (s) => round(s.weightKg * (1 + s.reps / 30));

// Personal bests per exercise, with the date each was set.
export function personalBests(sets) {
  const pb = {};
  for (const s of sets) {
    const p = (pb[s.exercise] ??= { maxWeightKg: 0, maxWeightAt: 0, best1RM: 0, best1RMAt: 0 });
    if (s.weightKg > p.maxWeightKg) { p.maxWeightKg = s.weightKg; p.maxWeightAt = s.loggedAt; }
    const e = estimated1RM(s);
    if (e > p.best1RM) { p.best1RM = e; p.best1RMAt = s.loggedAt; }
  }
  return pb;
}

// Rep PRs: the most reps ever done at each weight for one exercise, heaviest first.
export function repPRs(sets, exercise) {
  const m = {};
  for (const s of sets)
    if (s.exercise === exercise && (!m[s.weightKg] || s.reps > m[s.weightKg].reps))
      m[s.weightKg] = { weightKg: s.weightKg, reps: s.reps, at: s.loggedAt };
  return Object.values(m).sort((a, b) => b.weightKg - a.weightKg);
}

// Does a freshly logged set beat everything logged earlier for that exercise? Returns PR labels.
export function newPRs(history, set) {
  const prior = history.filter((h) => h.exercise === set.exercise && h.loggedAt < set.loggedAt);
  if (!prior.length) return []; // the very first time doing an exercise is not a "PR"
  const out = [];
  if (set.weightKg > Math.max(...prior.map((h) => h.weightKg))) out.push("heaviest weight");
  const same = prior.filter((h) => h.weightKg === set.weightKg);
  if (same.length && set.reps > Math.max(...same.map((h) => h.reps))) out.push(`most reps at ${set.weightKg} kg`);
  if (estimated1RM(set) > Math.max(...prior.map(estimated1RM))) out.push("estimated 1RM");
  return out;
}

// Where a trained day sits in the cycle: the first slot from the suggested one onward that matches it.
// Doing Legs on a Push day counts as the Legs slot, so the cycle carries on from there.
export function cycleIndexFor(type, pointer) {
  for (let k = 0; k < CYCLE.length; k++) {
    const i = (pointer + k) % CYCLE.length;
    if (CYCLE[i] === type) return i;
  }
  return pointer;
}
