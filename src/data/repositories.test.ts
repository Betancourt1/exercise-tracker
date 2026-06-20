import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";
import type { Exercise, Routine, RoutineDay, RoutineExercise, SetLog, WorkoutSession } from "../domain";
import {
  archiveExercise,
  ensureSettings,
  getSettings,
  listActiveRoutines,
  listAvailableExercises,
  listExercises,
  listRoutineDays,
  listRoutineExercisesForDay,
  listSetLogsForSession,
  saveExercise,
  saveRoutine,
  saveRoutineDay,
  saveRoutineExercise,
  saveSetLog,
  saveSettings,
  saveWorkoutSession,
  softDeleteRoutine,
  WorkoutDatabase,
} from "./index";

describe("data repositories", () => {
  it("wraps common Dexie operations behind thin repository helpers", async () => {
    const db = new WorkoutDatabase(`test-repositories-${crypto.randomUUID()}`);
    const exercise = createExercise();
    const routine = createRoutine();
    const routineDay = createRoutineDay();
    const routineExercise = createRoutineExercise();
    const session = createWorkoutSession();
    const setLog = createSetLog();

    try {
      await saveExercise(exercise, db);
      await saveRoutine(routine, db);
      await saveRoutineDay(routineDay, db);
      await saveRoutineExercise(routineExercise, db);
      await saveWorkoutSession(session, db);
      await saveSetLog(setLog, db);

      expect((await listExercises(db)).map((record) => record.id)).toEqual(["exercise-1"]);
      expect((await listAvailableExercises(db)).map((record) => record.id)).toEqual([
        "exercise-1",
      ]);

      await archiveExercise("exercise-1", "2026-06-20T02:00:00.000Z", db);
      expect(await listAvailableExercises(db)).toEqual([]);

      expect((await listActiveRoutines(db)).map((record) => record.id)).toEqual(["routine-1"]);
      expect((await listRoutineDays("routine-1", db)).map((record) => record.id)).toEqual([
        "routine-day-1",
      ]);
      expect(
        (await listRoutineExercisesForDay("routine-day-1", db)).map((record) => record.id),
      ).toEqual(["routine-exercise-1"]);

      await softDeleteRoutine("routine-1", "2026-06-20T03:00:00.000Z", db);
      expect(await listActiveRoutines(db)).toEqual([]);

      expect((await listSetLogsForSession("session-1", db)).map((record) => record.id)).toEqual([
        "set-1",
      ]);

      const defaultSettings = await ensureSettings(db);
      await saveSettings({ ...defaultSettings, unitSystem: "imperial" }, db);
      expect((await getSettings(db)).unitSystem).toBe("imperial");
    } finally {
      db.close();
      await db.delete();
    }
  });
});

function createExercise(): Exercise {
  return {
    id: "exercise-1",
    name: "Sentadilla",
    nameNormalized: "sentadilla",
    primaryMuscles: ["pierna"],
    secondaryMuscles: [],
    equipment: ["barra"],
    tags: ["fuerza"],
    guide: {
      setup: ["Prepara la barra."],
      technique: ["Baja con control."],
      commonMistakes: ["Perder postura."],
    },
    isCustom: false,
    archivedAt: null,
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
  };
}

function createRoutine(): Routine {
  return {
    id: "routine-1",
    name: "Fuerza 4 días",
    goal: "Fuerza",
    status: "active",
    manualOrder: 1,
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    deletedAt: null,
    previousStatus: null,
  };
}

function createRoutineDay(): RoutineDay {
  return {
    id: "routine-day-1",
    routineId: "routine-1",
    label: "Lunes",
    weekday: 1,
    sortOrder: 1,
    isActive: true,
  };
}

function createRoutineExercise(): RoutineExercise {
  return {
    id: "routine-exercise-1",
    routineDayId: "routine-day-1",
    exerciseId: "exercise-1",
    sortOrder: 1,
    targetSets: 4,
    targetRepsMin: 5,
    targetRepsMax: 8,
    targetRir: 2,
    restSeconds: 120,
    notes: "",
  };
}

function createWorkoutSession(): WorkoutSession {
  return {
    id: "session-1",
    status: "completed",
    source: "routine",
    routineId: "routine-1",
    routineRevisionId: null,
    routineNameSnapshot: "Fuerza 4 días",
    routineDayLabelSnapshot: "Lunes",
    startedAt: "2026-06-20T00:00:00.000Z",
    endedAt: "2026-06-20T01:00:00.000Z",
    durationSeconds: 3600,
    pausedSeconds: 0,
    notes: "",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T01:00:00.000Z",
    completedSetCount: 1,
    volumeKg: 500,
    prCount: 0,
  };
}

function createSetLog(): SetLog {
  return {
    id: "set-1",
    sessionId: "session-1",
    exerciseId: "exercise-1",
    routineExerciseId: "routine-exercise-1",
    exerciseNameSnapshot: "Sentadilla",
    guideSnapshot: null,
    setIndex: 1,
    weightKg: 100,
    reps: 5,
    rir: 2,
    completed: true,
    completedAt: "2026-06-20T00:10:00.000Z",
    targetSnapshot: {
      sortOrder: 1,
      targetSets: 4,
      targetRepsMin: 5,
      targetRepsMax: 8,
      targetRir: 2,
      restSeconds: 120,
    },
    notes: "",
  };
}
