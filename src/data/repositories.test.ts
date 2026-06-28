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
import {
  EXERCISE_LIBRARY_SEED_META_ID,
  archiveExercise,
  completeWorkoutSession,
  createSeedExercises,
  createWorkoutDraft,
  discardWorkoutSession,
  ensureSettings,
  getLatestInProgressWorkoutDraft,
  getSettings,
  getOrCreateWorkoutDraft,
  listSeededAvailableExercises,
  listActiveRoutines,
  listAvailableExercises,
  listCompletedProgressSetLogs,
  listCompletedWorkoutSessions,
  listCompletedSetLogsForExercise,
  listExercises,
  listRoutineDays,
  listRoutineExercisesForDay,
  listSetLogsForSession,
  getWorkoutSession,
  saveExercise,
  saveRoutine,
  saveRoutineDay,
  saveRoutineExercise,
  saveSetLog,
  saveSettings,
  saveRoutineGraph,
  saveRoutineGraphRevision,
  seedExerciseLibrary,
  saveWorkoutSession,
  softDeleteRoutine,
  restoreRoutine,
  updateRoutineManualOrders,
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

  it("creates and completes a workout session with set snapshots", async () => {
    const db = new WorkoutDatabase(`test-complete-workout-${crypto.randomUUID()}`);
    const session = createWorkoutSession({
      status: "in_progress",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
    });
    const setLogs = [
      createSetLog({
        completed: true,
        completedAt: "2026-06-20T00:10:00.000Z",
        weightKg: 100,
        reps: 5,
      }),
      createSetLog({
        id: "set-2",
        setIndex: 2,
        completed: false,
        completedAt: null,
        weightKg: 80,
        reps: 8,
      }),
    ];

    try {
      await createWorkoutDraft(session, setLogs, db);

      const restoredDraft = await getLatestInProgressWorkoutDraft(db);
      expect(restoredDraft?.session.id).toBe("session-1");
      expect(restoredDraft?.setLogs).toHaveLength(2);

      const result = await completeWorkoutSession(
        "session-1",
        setLogs,
        "2026-06-20T01:00:00.000Z",
        db,
      );

      expect(result?.session).toMatchObject({
        status: "completed",
        endedAt: "2026-06-20T01:00:00.000Z",
        durationSeconds: 3600,
        completedSetCount: 1,
        volumeKg: 500,
        routineId: "routine-1",
        routineRevisionId: null,
        routineNameSnapshot: "Fuerza 4 días",
        routineDayLabelSnapshot: "Lunes",
      });
      expect(result?.setLogs[0]).toMatchObject({
        exerciseNameSnapshot: "Sentadilla",
        targetSnapshot: {
          sortOrder: 1,
          targetSets: 4,
        },
        guideSnapshot: null,
      });
      expect(await getLatestInProgressWorkoutDraft(db)).toBeNull();
      expect((await listSetLogsForSession("session-1", db)).map((setLog) => setLog.id)).toEqual([
        "set-1",
        "set-2",
      ]);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("gets or creates an in-progress workout draft idempotently for concurrent starts", async () => {
    const db = new WorkoutDatabase(`test-idempotent-workout-start-${crypto.randomUUID()}`);
    const firstSession = createWorkoutSession({
      id: "session-a",
      status: "in_progress",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
      routineRevisionId: "routine-revision-1",
    });
    const secondSession = createWorkoutSession({
      id: "session-b",
      status: "in_progress",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
      routineRevisionId: "routine-revision-1",
    });

    try {
      const [firstDraft, secondDraft] = await Promise.all([
        getOrCreateWorkoutDraft(
          firstSession,
          [createSetLog({ id: "set-a", sessionId: "session-a" })],
          db,
        ),
        getOrCreateWorkoutDraft(
          secondSession,
          [createSetLog({ id: "set-b", sessionId: "session-b" })],
          db,
        ),
      ]);
      const inProgressSessions = await db.workoutSessions
        .where("status")
        .equals("in_progress")
        .toArray();

      expect(firstDraft.session.id).toBe(secondDraft.session.id);
      expect(inProgressSessions).toHaveLength(1);
      expect(await listSetLogsForSession(firstDraft.session.id, db)).toHaveLength(1);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("completed workout metrics ignore incomplete and invalid sets", async () => {
    const db = new WorkoutDatabase(`test-complete-workout-invalid-${crypto.randomUUID()}`);
    const session = createWorkoutSession({
      status: "in_progress",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
    });
    const setLogs = [
      createSetLog({ id: "set-valid", completed: true, weightKg: 50, reps: 4 }),
      createSetLog({
        id: "set-no-weight",
        setIndex: 2,
        completed: true,
        weightKg: null,
        reps: 8,
      }),
      createSetLog({
        id: "set-zero-reps",
        setIndex: 3,
        completed: true,
        weightKg: 80,
        reps: 0,
      }),
      createSetLog({
        id: "set-incomplete",
        setIndex: 4,
        completed: false,
        weightKg: 100,
        reps: 5,
      }),
    ];

    try {
      await createWorkoutDraft(session, setLogs, db);
      const result = await completeWorkoutSession(
        "session-1",
        setLogs,
        "2026-06-20T01:00:00.000Z",
        db,
      );

      expect(result?.completedSetCount).toBe(1);
      expect(result?.volumeKg).toBe(200);
      expect(
        result?.setLogs.map((setLog) => ({
          id: setLog.id,
          completed: setLog.completed,
          completedAt: setLog.completedAt,
        })),
      ).toEqual([
        {
          id: "set-valid",
          completed: true,
          completedAt: "2026-06-20T00:10:00.000Z",
        },
        { id: "set-no-weight", completed: false, completedAt: null },
        { id: "set-zero-reps", completed: false, completedAt: null },
        { id: "set-incomplete", completed: false, completedAt: null },
      ]);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("does not complete a workout when there are no valid completed sets", async () => {
    const db = new WorkoutDatabase(`test-complete-workout-empty-${crypto.randomUUID()}`);
    const session = createWorkoutSession({
      status: "in_progress",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
    });
    const setLogs = [
      createSetLog({ completed: false, weightKg: 100, reps: 5 }),
      createSetLog({
        id: "set-invalid",
        setIndex: 2,
        completed: true,
        weightKg: null,
        reps: 5,
      }),
    ];

    try {
      await createWorkoutDraft(session, setLogs, db);
      const result = await completeWorkoutSession(
        "session-1",
        setLogs,
        "2026-06-20T01:00:00.000Z",
        db,
      );

      expect(result).toBeNull();
      expect(await getWorkoutSession("session-1", db)).toMatchObject({
        status: "in_progress",
        completedSetCount: 0,
        volumeKg: 0,
      });
      expect(await getLatestInProgressWorkoutDraft(db)).toMatchObject({
        session: expect.objectContaining({ id: "session-1" }),
      });
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("lists completed set logs only when the parent session is completed", async () => {
    const db = new WorkoutDatabase(`test-completed-set-parent-session-${crypto.randomUUID()}`);
    const completedSession = createWorkoutSession({
      id: "completed-session",
      status: "completed",
    });
    const inProgressSession = createWorkoutSession({
      id: "draft-session",
      status: "in_progress",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
    });

    try {
      await saveWorkoutSession(completedSession, db);
      await saveWorkoutSession(inProgressSession, db);
      await saveSetLog(
        createSetLog({
          id: "completed-set",
          sessionId: "completed-session",
          completed: true,
        }),
        db,
      );
      await saveSetLog(
        createSetLog({
          id: "draft-set",
          sessionId: "draft-session",
          completed: true,
        }),
        db,
      );

      expect((await listCompletedSetLogsForExercise("exercise-1", db)).map((setLog) => setLog.id))
        .toEqual(["completed-set"]);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("lists progress sessions and set logs only from completed workouts", async () => {
    const db = new WorkoutDatabase(`test-progress-completed-only-${crypto.randomUUID()}`);
    const completedSession = createWorkoutSession({
      id: "completed-session",
      status: "completed",
      startedAt: "2026-06-20T00:00:00.000Z",
    });
    const inProgressSession = createWorkoutSession({
      id: "draft-session",
      status: "in_progress",
      startedAt: "2026-06-21T00:00:00.000Z",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
    });
    const discardedSession = createWorkoutSession({
      id: "discarded-session",
      status: "discarded",
      startedAt: "2026-06-22T00:00:00.000Z",
      completedSetCount: 0,
      volumeKg: 0,
    });

    try {
      await saveWorkoutSession(completedSession, db);
      await saveWorkoutSession(inProgressSession, db);
      await saveWorkoutSession(discardedSession, db);
      await saveSetLog(
        createSetLog({
          id: "completed-set",
          sessionId: "completed-session",
          completed: true,
          completedAt: "2026-06-20T00:10:00.000Z",
        }),
        db,
      );
      await saveSetLog(
        createSetLog({
          id: "completed-session-incomplete-set",
          sessionId: "completed-session",
          completed: false,
          completedAt: null,
        }),
        db,
      );
      await saveSetLog(
        createSetLog({
          id: "draft-set",
          sessionId: "draft-session",
          completed: true,
          completedAt: "2026-06-21T00:10:00.000Z",
        }),
        db,
      );
      await saveSetLog(
        createSetLog({
          id: "discarded-set",
          sessionId: "discarded-session",
          completed: true,
          completedAt: "2026-06-22T00:10:00.000Z",
        }),
        db,
      );

      expect((await listCompletedWorkoutSessions(db)).map((session) => session.id)).toEqual([
        "completed-session",
      ]);
      expect((await listCompletedProgressSetLogs(db)).map((setLog) => setLog.id)).toEqual([
        "completed-set",
      ]);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("discards an in-progress workout without completed progress", async () => {
    const db = new WorkoutDatabase(`test-discard-workout-${crypto.randomUUID()}`);
    const session = createWorkoutSession({
      status: "in_progress",
      endedAt: null,
      durationSeconds: 0,
      completedSetCount: 0,
      volumeKg: 0,
    });
    const setLogs = [createSetLog({ completed: true, weightKg: 100, reps: 5 })];

    try {
      await createWorkoutDraft(session, setLogs, db);
      const result = await discardWorkoutSession(
        "session-1",
        "2026-06-20T00:30:00.000Z",
        db,
      );

      expect(result?.session).toMatchObject({
        status: "discarded",
        durationSeconds: 1800,
        completedSetCount: 0,
        volumeKg: 0,
      });
      expect(result?.setLogs.every((setLog) => !setLog.completed)).toBe(true);
      expect(await getLatestInProgressWorkoutDraft(db)).toBeNull();
      expect(await getWorkoutSession("session-1", db)).toMatchObject({
        status: "discarded",
      });
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("saves routine graph atomically", async () => {
    const db = new WorkoutDatabase(`test-routine-graph-${crypto.randomUUID()}`);
    const routine = createRoutine();
    const routineDay = createRoutineDay();
    const routineExercise = createRoutineExercise();
    const routineRevision = createRoutineRevision(routine, routineDay, routineExercise);

    try {
      await saveRoutineGraph(
        {
          routine,
          routineDays: [routineDay],
          routineExercises: [routineExercise],
          routineRevision,
        },
        db,
      );

      expect(await db.routines.get("routine-1")).toMatchObject({ id: "routine-1" });
      expect(await db.routineDays.get("routine-day-1")).toMatchObject({
        id: "routine-day-1",
      });
      expect(await db.routineExercises.get("routine-exercise-1")).toMatchObject({
        id: "routine-exercise-1",
      });
      expect(await db.routineRevisions.get("routine-revision-1")).toMatchObject({
        id: "routine-revision-1",
        effectiveTo: null,
      });
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("saves edited routine graph with a new revision snapshot", async () => {
    const db = new WorkoutDatabase(`test-edited-routine-graph-${crypto.randomUUID()}`);
    const savedAt = "2026-06-22T00:00:00.000Z";
    const routine = createRoutine();
    const routineDay = createRoutineDay();
    const originalRoutineExercise = createRoutineExercise();
    const nextRoutineExercise: RoutineExercise = {
      ...createRoutineExercise(),
      id: "routine-exercise-2",
      targetSets: 5,
      sortOrder: 1,
      notes: "Mantener técnica limpia.",
    };
    const routineRevision = createRoutineRevision(
      routine,
      routineDay,
      originalRoutineExercise,
    );

    try {
      await saveRoutineGraph(
        {
          routine,
          routineDays: [routineDay],
          routineExercises: [originalRoutineExercise],
          routineRevision,
        },
        db,
      );

      await saveRoutineGraphRevision(
        {
          routine,
          routineDays: [routineDay],
          routineExercises: [nextRoutineExercise],
        },
        savedAt,
        db,
      );

      const routineExercises = await db.routineExercises.toArray();
      const revisions = await db.routineRevisions
        .where("routineId")
        .equals("routine-1")
        .toArray();
      const activeRevision = revisions.find((revision) => revision.effectiveTo === null);

      expect(routineExercises.map((routineExercise) => routineExercise.id)).toEqual([
        "routine-exercise-2",
      ]);
      expect(await db.routineRevisions.get("routine-revision-1")).toMatchObject({
        effectiveTo: savedAt,
      });
      expect(revisions).toHaveLength(2);
      expect(activeRevision).toMatchObject({
        revisionNumber: 2,
        effectiveFrom: savedAt,
        effectiveTo: null,
      });
      expect(activeRevision?.snapshot.routine.updatedAt).toBe(savedAt);
      expect(activeRevision?.snapshot.routineExercises).toMatchObject([
        {
          id: "routine-exercise-2",
          targetSets: 5,
          notes: "Mantener técnica limpia.",
        },
      ]);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("updates routine manual order in a batch", async () => {
    const db = new WorkoutDatabase(`test-routine-order-${crypto.randomUUID()}`);
    const firstRoutine = createRoutine();
    const secondRoutine: Routine = {
      ...createRoutine(),
      id: "routine-2",
      name: "Tren superior",
      manualOrder: 2,
    };

    try {
      await saveRoutine(firstRoutine, db);
      await saveRoutine(secondRoutine, db);

      await updateRoutineManualOrders(
        [
          { routineId: "routine-1", manualOrder: 2, updatedAt: "2026-06-21T00:00:00.000Z" },
          { routineId: "routine-2", manualOrder: 1, updatedAt: "2026-06-21T00:00:00.000Z" },
        ],
        db,
      );

      expect((await listActiveRoutines(db)).map((routine) => routine.id)).toEqual([
        "routine-2",
        "routine-1",
      ]);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("soft delete closes the active routine revision", async () => {
    const db = new WorkoutDatabase(`test-soft-delete-routine-${crypto.randomUUID()}`);
    const deletedAt = "2026-06-21T00:00:00.000Z";
    const routine = createRoutine();
    const routineDay = createRoutineDay();
    const routineExercise = createRoutineExercise();
    const routineRevision = createRoutineRevision(routine, routineDay, routineExercise);

    try {
      await saveRoutineGraph(
        {
          routine,
          routineDays: [routineDay],
          routineExercises: [routineExercise],
          routineRevision,
        },
        db,
      );

      await softDeleteRoutine("routine-1", deletedAt, db);

      expect(await db.routines.get("routine-1")).toMatchObject({
        status: "deleted",
        deletedAt,
        previousStatus: "active",
      });
      expect(await db.routineRevisions.get("routine-revision-1")).toMatchObject({
        effectiveTo: deletedAt,
      });
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("restore routine creates a new active revision window", async () => {
    const db = new WorkoutDatabase(`test-restore-routine-${crypto.randomUUID()}`);
    const deletedAt = "2026-06-21T00:00:00.000Z";
    const restoredAt = "2026-06-22T00:00:00.000Z";
    const routine = createRoutine();
    const routineDay = createRoutineDay();
    const routineExercise = createRoutineExercise();
    const routineRevision = createRoutineRevision(routine, routineDay, routineExercise);

    try {
      await saveRoutineGraph(
        {
          routine,
          routineDays: [routineDay],
          routineExercises: [routineExercise],
          routineRevision,
        },
        db,
      );

      await softDeleteRoutine("routine-1", deletedAt, db);
      await restoreRoutine("routine-1", restoredAt, db);

      const restoredRoutine = await db.routines.get("routine-1");
      const revisions = await db.routineRevisions
        .where("routineId")
        .equals("routine-1")
        .toArray();
      const activeRevision = revisions.find((revision) => revision.effectiveTo === null);

      expect(restoredRoutine).toMatchObject({
        status: "active",
        deletedAt: null,
        previousStatus: null,
      });
      expect(revisions).toHaveLength(2);
      expect(activeRevision).toMatchObject({
        revisionNumber: 2,
        effectiveFrom: restoredAt,
        effectiveTo: null,
      });
      expect(activeRevision?.snapshot.routine.status).toBe("active");
      expect(activeRevision?.snapshot.routineDays).toHaveLength(1);
      expect(activeRevision?.snapshot.routineExercises).toHaveLength(1);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("restore routine assigns a safe manual order after delete and create", async () => {
    const db = new WorkoutDatabase(`test-restore-routine-order-${crypto.randomUUID()}`);
    const firstRoutine = createRoutine();
    const secondRoutine: Routine = {
      ...createRoutine(),
      id: "routine-2",
      name: "Hipertrofia 3 días",
      manualOrder: 1,
    };

    try {
      await saveRoutine(firstRoutine, db);
      await softDeleteRoutine("routine-1", "2026-06-21T00:00:00.000Z", db);
      await saveRoutine(secondRoutine, db);
      await restoreRoutine("routine-1", "2026-06-22T00:00:00.000Z", db);

      const activeRoutines = await listActiveRoutines(db);
      const manualOrders = activeRoutines.map((routine) => routine.manualOrder);

      expect(new Set(manualOrders).size).toBe(manualOrders.length);
      expect(activeRoutines.map((routine) => routine.id)).toEqual(["routine-2", "routine-1"]);
      expect(activeRoutines.find((routine) => routine.id === "routine-1")?.manualOrder).toBe(2);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("loads seeded available exercises through the exercise repository", async () => {
    const db = new WorkoutDatabase(`test-seeded-exercise-repository-${crypto.randomUUID()}`);

    try {
      const exercises = await listSeededAvailableExercises(db);
      const exerciseNames = exercises.map((exercise) => exercise.name);
      const normalizedNames = exercises.map((exercise) => exercise.nameNormalized);

      expect(exercises).toHaveLength(createSeedExercises().length);
      expect(normalizedNames).toEqual([...normalizedNames].sort());
      expect(exerciseNames).toEqual(
        expect.arrayContaining([
          "Sentadilla",
          "Flexiones",
          "Jalón al pecho",
          "Plancha",
          "Farmer carry",
        ]),
      );
      expect(exercises.find((exercise) => exercise.name === "Press banca")?.media).toMatchObject({
        source: "hasaneyldrm/exercises-dataset",
        sourceExerciseId: "0025",
        sourceExerciseName: "barbell bench press",
      });
      expect(exercises.find((exercise) => exercise.name === "Face pull")?.media).toBeUndefined();
      expect(exercises.every((exercise) => exercise.archivedAt === null)).toBe(true);
    } finally {
      db.close();
      await db.delete();
    }
  });

  it("seeds the exercise library idempotently under concurrent calls", async () => {
    const db = new WorkoutDatabase(`test-concurrent-exercise-seed-${crypto.randomUUID()}`);

    try {
      const insertedCounts = await Promise.all([
        seedExerciseLibrary(db),
        seedExerciseLibrary(db),
      ]);
      const exercises = await listSeededAvailableExercises(db);
      const seedMeta = await db.meta.get(EXERCISE_LIBRARY_SEED_META_ID);
      const exerciseIds = exercises.map((exercise) => exercise.id);

      expect(insertedCounts.reduce((total, count) => total + count, 0)).toBe(
        createSeedExercises().length,
      );
      expect(exercises).toHaveLength(createSeedExercises().length);
      expect(new Set(exerciseIds).size).toBe(createSeedExercises().length);
      expect(exerciseIds.every((id) => id.startsWith("seed:exercise:"))).toBe(true);
      expect(
        exercises.every((exercise) => Boolean(exercise.equipmentDetail?.trim())),
      ).toBe(true);
      expect(seedMeta).toMatchObject({
        id: EXERCISE_LIBRARY_SEED_META_ID,
      });
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
    type: "reps",
    weightRelevant: true,
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
    targetWeightKg: null,
  };
}

function createWorkoutSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
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
    ...overrides,
  };
}

function createSetLog(overrides: Partial<SetLog> = {}): SetLog {
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
      targetWeightKg: null,
    },
    notes: "",
    ...overrides,
  };
}

function createRoutineRevision(
  routine: Routine,
  routineDay: RoutineDay,
  routineExercise: RoutineExercise,
): RoutineRevision {
  return {
    id: "routine-revision-1",
    routineId: routine.id,
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
