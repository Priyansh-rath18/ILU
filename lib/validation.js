import { z } from "zod";
import { ALLOWED_SLUGS, ACTIVITY_LEVELS, GOALS } from "./plan";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((d) => !Number.isNaN(new Date(d).getTime()), "Invalid date");

// A single set: numeric, and bounded to sane physical limits so no one can
// stuff megabytes of data into one field or store non-numeric payloads.
// The client always sends real numbers or null (never empty strings), so we
// validate types strictly instead of coercing — coercion on loosely-typed
// input (e.g. Number('') === 0) is a common source of silent data bugs.
const setEntry = z.object({
  weight: z.number().min(0).max(2000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
});

export const workoutLogBatchSchema = z.object({
  date: isoDate,
  entries: z
    .array(
      z.object({
        exercise: z.string().refine((s) => ALLOWED_SLUGS.has(s), "Unknown exercise"),
        sets: z.array(setEntry).max(20),
      })
    )
    .max(20),
});

export const nutritionSettingsSchema = z.object({
  weight: z.number().positive().max(400),
  activity: z.enum(ACTIVITY_LEVELS),
  goal: z.enum(GOALS),
});

export const weightLogSchema = z.object({
  date: isoDate,
  weight: z.number().positive().max(400),
});

export const checklistSchema = z.object({
  date: isoDate,
  protein: z.boolean(),
  calories: z.boolean(),
  creatine: z.boolean(),
  water: z.boolean(),
});
