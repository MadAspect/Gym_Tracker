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

// Personal bests per exercise: heaviest weight and best estimated 1RM.
export function personalBests(sets) {
  const pb = {};
  for (const s of sets) {
    const p = (pb[s.exercise] ??= { maxWeightKg: 0, best1RM: 0 });
    p.maxWeightKg = Math.max(p.maxWeightKg, s.weightKg);
    p.best1RM = Math.max(p.best1RM, estimated1RM(s));
  }
  return pb;
}
