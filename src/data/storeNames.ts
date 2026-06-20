export const CORE_STORE_NAMES = [
  "meta",
  "exercises",
  "routines",
  "routineDays",
  "routineExercises",
  "routineRevisions",
  "workoutSessions",
  "setLogs",
  "settings",
] as const;

export type CoreStoreName = (typeof CORE_STORE_NAMES)[number];
