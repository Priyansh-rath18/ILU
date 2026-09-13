export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const PLAN = {
  1: {
    label: "Monday — Back & Biceps",
    exercises: [
      { name: "Lat Pulldown", sets: 2 },
      { name: "Chest-Supported Incline Row", sets: 2 },
      { name: "Wide-Grip Row", sets: 3 },
      { name: "Lat Pullover", sets: 2 },
      { name: "Preacher Curl", sets: 2 },
      { name: "Incline Dumbbell Curl", sets: 2 },
      { name: "Reverse Pec Deck Fly", sets: 2 },
      { name: "Hammer Curl", sets: 2 },
    ],
  },
  2: {
    label: "Tuesday — Chest, Triceps & Shoulders",
    exercises: [
      { name: "Incline Bench Press", sets: 4 },
      { name: "Pec Deck Fly", sets: 3 },
      { name: "Parallel Dips", sets: 3 },
      { name: "Overhead Single-Arm Triceps Extension", sets: 2 },
      { name: "Rope Pushdown", sets: 2 },
      { name: "Reverse-Grip Triceps Pushdown", sets: 2 },
      { name: "Lateral Raise", repGoal: 100 },
      { name: "Front Raise", sets: 3 },
    ],
  },
  3: {
    label: "Wednesday — Legs & Rear Delts",
    exercises: [
      { name: "Hamstring Curl", sets: 4 },
      { name: "Leg Extension", sets: 4 },
      { name: "Leg Press", sets: 2 },
      { name: "Calf Raise", sets: 2 },
      { name: "Reverse Pec Deck Fly", sets: 3 },
      { name: "Shrugs", sets: 2 },
      { name: "Chest-Supported Incline Row", sets: 2 },
    ],
  },
  4: {
    label: "Thursday — Back, Chest & Shoulders",
    exercises: [
      { name: "Weighted Pull-ups", sets: 4 },
      { name: "Flat Bench Press", sets: 4 },
      { name: "Lateral Raise", repGoal: 100 },
      { name: "Overhead Dumbbell Press", sets: 3 },
    ],
  },
  5: {
    label: "Friday — Arms & Rear Delts",
    exercises: [
      { name: "Biceps Curl", sets: 3 },
      { name: "Hammer Curl", sets: 3 },
      { name: "Overhead Cable Triceps Extension", sets: 3 },
      { name: "Triceps Pushdown", sets: 3 },
      { name: "Reverse Pec Deck Fly", sets: 2 },
      { name: "Shrugs", sets: 2 },
    ],
  },
  6: {
    label: "Saturday — Legs & Shoulders",
    exercises: [
      { name: "Barbell Squat", sets: 5 },
      { name: "Lateral Raise", repGoal: 100 },
      { name: "Front Raise", sets: 2 },
    ],
  },
  0: { label: "Sunday — Rest", exercises: [] },
};

// Server-side allow-list: the only exercise slugs a WorkoutLog row may ever use.
export const ALLOWED_SLUGS = new Set(
  Object.values(PLAN).flatMap((day) => day.exercises.map((e) => slugify(e.name)))
);

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "very"];
export const GOALS = ["loss", "gain", "maintain"];

const ACTIVITY_CAL = { sedentary: 26.5, light: 30, moderate: 33.5, very: 37.5 }; // kcal/kg
const ACTIVITY_WATER = { sedentary: 30, light: 32, moderate: 35, very: 38 }; // mL/kg
const GOAL_PROTEIN = { loss: 2.0, maintain: 1.4, gain: 1.8 }; // g/kg
const GOAL_CAL_ADJUST = { loss: -100, maintain: 0, gain: 100 };

export function computeTargets(weight, activity, goal) {
  const maintenance = weight * ACTIVITY_CAL[activity];
  const calories = Math.round(maintenance + GOAL_CAL_ADJUST[goal]);
  const water = Math.round(weight * ACTIVITY_WATER[activity]);
  const protein = Math.round(weight * GOAL_PROTEIN[goal]);
  return { calories, water, protein };
}
