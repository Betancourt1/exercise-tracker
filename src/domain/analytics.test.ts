import { describe, expect, it } from "vitest";
import {
  buildProgressAnalytics,
  calculateAdherence,
  calculateEstimatedOneRepMax,
  calculatePrsByExercise,
  calculateSessionVolume,
  calculateSetVolume,
} from "./analytics";
import type { Exercise, SetLog, WorkoutSession } from "./types";

describe("analytics helpers", () => {
  it("calculates set volume only for completed valid sets", () => {
    expect(calculateSetVolume({ completed: true, weightKg: 100, reps: 5 })).toBe(500);
    expect(calculateSetVolume({ completed: false, weightKg: 100, reps: 5 })).toBe(0);
    expect(calculateSetVolume({ completed: true, weightKg: null, reps: 5 })).toBe(0);
    expect(calculateSetVolume({ completed: true, weightKg: 100, reps: 0 })).toBe(0);
    expect(calculateSetVolume({ completed: true, weightKg: -10, reps: 5 })).toBe(0);
  });

  it("sums session volume from completed sets", () => {
    expect(
      calculateSessionVolume([
        { completed: true, weightKg: 100, reps: 5 },
        { completed: true, weightKg: 80, reps: 8 },
        { completed: false, weightKg: 120, reps: 3 },
      ]),
    ).toBe(1140);
  });

  it("calculates estimated 1RM with Epley for completed sets in the valid rep range", () => {
    expect(calculateEstimatedOneRepMax({ completed: true, weightKg: 100, reps: 6 })).toBe(120);
    expect(calculateEstimatedOneRepMax({ completed: false, weightKg: 100, reps: 6 })).toBeNull();
    expect(calculateEstimatedOneRepMax({ completed: true, weightKg: 100, reps: 13 })).toBeNull();
    expect(calculateEstimatedOneRepMax({ completed: true, weightKg: 0, reps: 6 })).toBeNull();
  });

  it("finds PRs per exercise from historical completed sets", () => {
    const prs = calculatePrsByExercise([
      {
        id: "set-1",
        exerciseId: "sentadilla",
        exerciseNameSnapshot: "Sentadilla",
        completed: true,
        completedAt: "2026-01-01T00:00:00.000Z",
        weightKg: 100,
        reps: 5,
      },
      {
        id: "set-2",
        exerciseId: "sentadilla",
        exerciseNameSnapshot: "Sentadilla",
        completed: true,
        completedAt: "2026-01-02T00:00:00.000Z",
        weightKg: 105,
        reps: 5,
      },
      {
        id: "set-3",
        exerciseId: "press-banca",
        exerciseNameSnapshot: "Press banca",
        completed: false,
        completedAt: "2026-01-03T00:00:00.000Z",
        weightKg: 80,
        reps: 5,
      },
    ]);

    expect(prs.sentadilla?.exerciseId).toBe("sentadilla");
    expect(prs.sentadilla?.setLogId).toBe("set-2");
    expect(prs.sentadilla?.estimatedOneRepMax).toBeCloseTo(122.5);
    expect(prs["press-banca"]).toBeUndefined();
  });

  it("returns adherence percentage capped at 100 and null when nothing was planned", () => {
    expect(calculateAdherence(3, 4)).toEqual({
      planned: 4,
      completed: 3,
      percentage: 75,
    });
    expect(calculateAdherence(6, 4)).toEqual({
      planned: 4,
      completed: 6,
      percentage: 100,
    });
    expect(calculateAdherence(0, 0)).toBeNull();
    expect(calculateAdherence(1, Number.NaN)).toBeNull();
    expect(calculateAdherence(Number.NaN, 4)).toBeNull();
    expect(calculateAdherence(Number.POSITIVE_INFINITY, 4)).toBeNull();
    expect(calculateAdherence(-2, 4)).toEqual({
      planned: 4,
      completed: 0,
      percentage: 0,
    });
  });

  it("builds progress only from completed sessions and valid completed sets", () => {
    const analytics = buildProgressAnalytics({
      sessions: [
        createSession({
          id: "session-completed",
          status: "completed",
          startedAt: "2026-06-20T00:00:00.000Z",
        }),
        createSession({
          id: "session-draft",
          status: "in_progress",
          startedAt: "2026-06-21T00:00:00.000Z",
          endedAt: null,
        }),
        createSession({
          id: "session-discarded",
          status: "discarded",
          startedAt: "2026-06-22T00:00:00.000Z",
        }),
      ],
      setLogs: [
        createSetLog({
          id: "completed-set",
          sessionId: "session-completed",
          completed: true,
          weightKg: 100,
          reps: 5,
        }),
        createSetLog({
          id: "invalid-set",
          sessionId: "session-completed",
          completed: true,
          weightKg: null,
          reps: 5,
        }),
        createSetLog({
          id: "incomplete-set",
          sessionId: "session-completed",
          completed: false,
          weightKg: 120,
          reps: 5,
        }),
        createSetLog({
          id: "draft-set",
          sessionId: "session-draft",
          completed: true,
          weightKg: 200,
          reps: 5,
        }),
        createSetLog({
          id: "discarded-set",
          sessionId: "session-discarded",
          completed: true,
          weightKg: 300,
          reps: 5,
        }),
      ],
    });

    expect(analytics.completedSessionCount).toBe(1);
    expect(analytics.completedSetCount).toBe(1);
    expect(analytics.totalVolumeKg).toBe(500);
    expect(analytics.exercisePrCount).toBe(1);
    expect(analytics.recentSessions).toEqual([
      expect.objectContaining({
        sessionId: "session-completed",
        completedSetCount: 1,
        volumeKg: 500,
      }),
    ]);
    expect(analytics.volumeTrend).toEqual([
      expect.objectContaining({
        sessionId: "session-completed",
        volumeKg: 500,
      }),
    ]);
    expect(analytics.exerciseDetails).toHaveLength(1);
    expect(analytics.exerciseDetails[0]).toMatchObject({
      exerciseId: "sentadilla",
      bestEstimatedOneRepMax: 116.66666666666667,
      bestWeightKg: 100,
      bestWeightReps: 5,
    });
  });

  it("builds weighted muscle loads from guide snapshots with exercise fallback", () => {
    const analytics = buildProgressAnalytics({
      sessions: [
        createSession({
          id: "session-completed",
          status: "completed",
          startedAt: "2026-06-20T00:00:00.000Z",
        }),
      ],
      exercises: [
        createExercise({
          id: "press-banca",
          name: "Press banca",
          primaryMuscles: ["pecho"],
          secondaryMuscles: ["tríceps"],
        }),
      ],
      setLogs: [
        createSetLog({
          id: "sentadilla-set",
          sessionId: "session-completed",
          exerciseId: "sentadilla",
          exerciseNameSnapshot: "Sentadilla",
          completed: true,
          weightKg: 100,
          reps: 5,
          guideSnapshot: {
            id: "sentadilla",
            name: "Sentadilla",
            type: "reps",
            primaryMuscles: ["cuádriceps"],
            secondaryMuscles: ["glúteos"],
            guide: {
              setup: ["Barra estable."],
              technique: ["Baja con control."],
              commonMistakes: ["Perder postura."],
            },
          },
        }),
        createSetLog({
          id: "press-set",
          sessionId: "session-completed",
          exerciseId: "press-banca",
          exerciseNameSnapshot: "Press banca",
          completed: true,
          weightKg: 50,
          reps: 10,
          guideSnapshot: null,
        }),
      ],
    });

    expect(analytics.muscleLoads).toEqual([
      expect.objectContaining({
        muscle: "cuádriceps",
        score: 1,
        completedSetCount: 1,
        primarySetCount: 1,
        secondarySetCount: 0,
        volumeKg: 500,
      }),
      expect.objectContaining({
        muscle: "pecho",
        score: 1,
        completedSetCount: 1,
        primarySetCount: 1,
        secondarySetCount: 0,
        volumeKg: 500,
      }),
      expect.objectContaining({
        muscle: "glúteos",
        score: 0.5,
        completedSetCount: 1,
        primarySetCount: 0,
        secondarySetCount: 1,
        volumeKg: 250,
      }),
      expect.objectContaining({
        muscle: "tríceps",
        score: 0.5,
        completedSetCount: 1,
        primarySetCount: 0,
        secondarySetCount: 1,
        volumeKg: 250,
      }),
    ]);
  });
});

function createSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: "session-1",
    status: "completed",
    source: "routine",
    routineId: "routine-1",
    routineRevisionId: null,
    routineNameSnapshot: "Fuerza",
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
    exerciseId: "sentadilla",
    routineExerciseId: "routine-exercise-1",
    exerciseNameSnapshot: "Sentadilla",
    guideSnapshot: {
      id: "sentadilla",
      name: "Sentadilla",
      type: "reps",
      guide: {
        setup: ["Barra estable."],
        technique: ["Baja con control."],
        commonMistakes: ["Perder postura."],
      },
    },
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

function createExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "sentadilla",
    name: "Sentadilla",
    nameNormalized: "sentadilla",
    type: "reps",
    weightRelevant: true,
    primaryMuscles: ["cuádriceps"],
    secondaryMuscles: ["glúteos"],
    equipment: ["barra"],
    tags: ["fuerza"],
    guide: {
      setup: ["Preparación."],
      technique: ["Técnica."],
      commonMistakes: ["Error común."],
    },
    isCustom: false,
    archivedAt: null,
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides,
  };
}
