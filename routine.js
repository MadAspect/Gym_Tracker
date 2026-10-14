// DATA: your default routine. Settings (Module 2) will let you edit a copy of this.
export const DEFAULT_ROUTINE = {
  push: [
    { name: "Machine Chest Press", sets: 3 },
    { name: "Pec Dec", sets: 2 },
    { name: "Incline Chest Press", sets: 2 },
    { name: "Machine Shoulder Press", sets: 2 },
    { name: "Cable Lateral Raises", sets: 2 },
    { name: "Overhead Tricep Extensions", sets: 2 },
    { name: "Tricep Pushdown", sets: 2 },
  ],
  pull: [
    { name: "Lat Pulldown", sets: 3 },
    { name: "Cable Rows", sets: 2 },
    { name: "Preacher Curls", sets: 2 },
    { name: "Hammer Curls", sets: 2 },
    { name: "Incline Curls", sets: 2 },
    { name: "Rear Delt Fly", sets: 2 },
  ],
  legs: [
    { name: "Leg Press", sets: 3 },
    { name: "RDLs", sets: 2 },
    { name: "Quad Extensions", sets: 2 },
    { name: "Hamstring Curls", sets: 2 },
    { name: "Smith Machine Calf Raises", sets: 2 },
  ],
};

// Your training cycle: PPL-PP, then 2 rest days (rest days aren't logged).
export const CYCLE = ["push", "pull", "legs", "push", "pull"];
