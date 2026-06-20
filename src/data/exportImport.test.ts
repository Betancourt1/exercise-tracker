import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";
import type {
  Exercise,
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineRevision,
  SetLog,
  WorkoutSession,
} from "../domain";
import type {
  DatabaseExportData,
} from "./index";
import {
  CORE_STORE_NAMES,
  createDatabaseExport,
  createEmptyExportData,
  EXPORT_FORMAT,
  EXPORT_SCHEMA_VERSION,
  parseImportJson,
  replaceDatabaseFromExportWithBackup,
  validateImportPayload,
  WorkoutDatabase,
} from "./index";
import { createDefaultSettings } from "./settings";

describe("database export/import helpers", () => {
  it("creates export payload with expected format, schema version, and all stores", () => {
    const exportedAt = "2026-06-20T00:00:00.000Z";
    const payload = createDatabaseExport(createEmptyExportData(), exportedAt);

    expect(payload.format).toBe(EXPORT_FORMAT);
    expect(payload.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(payload.exportedAt).toBe(exportedAt);

    for (const storeName of CORE_STORE_NAMES) {
      expect(Array.isArray(payload.data[storeName])).toBe(true);
    }
  });

  it("validates a serialized export payload", () => {
    const payload = createDatabaseExport(createEmptyExportData());
    const result = parseImportJson(JSON.stringify(payload));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe(EXPORT_FORMAT);
    }
  });

  it("rejects invalid JSON and invalid export shape", () => {
    expect(parseImportJson("{invalid").ok).toBe(false);
    expect(validateImportPayload(null).ok).toBe(false);
    expect(validateImportPayload({}).ok).toBe(false);
    expect(
      validateImportPayload({
        format: EXPORT_FORMAT,
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: "2026-06-20T00:00:00.000Z",
        data: {},
      }).ok,
    ).toBe(false);
  });

  it("rejects future schema versions", () => {
    const result = validateImportPayload({
      format: EXPORT_FORMAT,
      schemaVersion: EXPORT_SCHEMA_VERSION + 1,
      exportedAt: "2026-06-20T00:00:00.000Z",
      data: createEmptyExportData(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("versión futura");
    }
  });

  it("rejects missing ids, bad statuses, and broken references", () => {
    const missingId = createValidExportData();
    missingId.exercises[0] = { ...missingId.exercises[0], id: "" };
    expect(validateImportPayload(createDatabaseExport(missingId)).ok).toBe(false);

    const badStatus = createValidExportData();
    badStatus.routines[0] = { ...badStatus.routines[0], status: "invalid" as Routine["status"] };
    expect(validateImportPayload(createDatabaseExport(badStatus)).ok).toBe(false);

    const brokenReference = createValidExportData();
    brokenReference.routineDays[0] = {
      ...brokenReference.routineDays[0],
      routineId: "missing-routine",
    };
    expect(validateImportPayload(createDatabaseExport(brokenReference)).ok).toBe(false);

    const brokenSetReference = createValidExportData();
    brokenSetReference.setLogs[0] = {
      ...brokenSetReference.setLogs[0],
      sessionId: "missing-session",
    };
    expect(validateImportPayload(createDatabaseExport(brokenSetReference)).ok).toBe(false);
  });

  it("safe replace returns a backup before replacing data", async () => {
    const db = new WorkoutDatabase(`test-safe-replace-${crypto.randomUUID()}`);
    const originalExercise = createExercise("original-exercise", "Sentadilla");
    const importData = createValidExportData();

    try {
      await db.exercises.put(originalExercise);

      const result = await replaceDatabaseFromExportWithBackup(
        createDatabaseExport(importData),
        db,
      );
      const exercisesAfterImport = await db.exercises.toArray();

      expect(result.backup.data.exercises).toHaveLength(1);
      expect(result.backup.data.exercises[0]?.id).toBe("original-exercise");
      expect(result.imported.data.exercises[0]?.id).toBe("exercise-1");
      expect(exercisesAfterImport.map((exercise) => exercise.id)).toEqual(["exercise-1"]);
    } finally {
      db.close();
      await db.delete();
    }
  });
});

function createValidExportData(): DatabaseExportData {
  const exercise = createExercise("exercise-1", "Sentadilla");
  const routine = createRoutine();
  const routineDay = createRoutineDay();
  const routineExercise = createRoutineExercise();
  const routineRevision = createRoutineRevision(routine, routineDay, routineExercise);
  const session = createWorkoutSession();
  const setLog = createSetLog();

  return {
    ...createEmptyExportData(),
    exercises: [exercise],
    routines: [routine],
    routineDays: [routineDay],
    routineExercises: [routineExercise],
    routineRevisions: [routineRevision],
    workoutSessions: [session],
    setLogs: [setLog],
    settings: [createDefaultSettings("2026-06-20T00:00:00.000Z")],
  };
}

function createExercise(id: string, name: string): Exercise {
  return {
    id,
    name,
    nameNormalized: name.toLocaleLowerCase("es-MX"),
    primaryMuscles: ["pierna"],
    secondaryMuscles: [],
    equipment: ["barra"],
    tags: ["fuerza"],
    guide: {
      setup: ["Prepara la barra."],
      technique: ["Mantén control."],
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

function createRoutineRevision(
  routine: Routine,
  routineDay: RoutineDay,
  routineExercise: RoutineExercise,
): RoutineRevision {
  return {
    id: "routine-revision-1",
    routineId: "routine-1",
    revisionNumber: 1,
    effectiveFrom: "2026-06-20T00:00:00.000Z",
    effectiveTo: null,
    snapshot: {
      routine,
      routineDays: [routineDay],
      routineExercises: [routineExercise],
    },
  };
}

function createWorkoutSession(): WorkoutSession {
  return {
    id: "session-1",
    status: "completed",
    source: "routine",
    routineId: "routine-1",
    routineRevisionId: "routine-revision-1",
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
