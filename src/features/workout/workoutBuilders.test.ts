import { describe, expect, it } from "vitest";
import { buildWorkoutDraftFromRoutine } from "./workoutBuilders";
import type { Exercise, RoutineRevision } from "../../domain";
import type { RoutineSummary } from "../routines/types";

describe("workoutBuilders", () => {
  it("builds workout draft from routine and initializes set logs with targetWeightKg", () => {
    const exercises: Exercise[] = [
      {
        id: "ex-1",
        name: "Sentadilla",
        nameNormalized: "sentadilla",
        type: "reps",
        primaryMuscles: ["pierna"],
        secondaryMuscles: [],
        equipment: ["barra"],
        tags: ["fuerza"],
        guide: { setup: [], technique: [], commonMistakes: [] },
        isCustom: false,
        archivedAt: null,
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
        weightRelevant: true,
      },
    ];

    const summary: RoutineSummary = {
      routine: {
        id: "routine-1",
        name: "Fuerza",
        goal: "Hipertrofia",
        status: "active",
        manualOrder: 1,
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
        deletedAt: null,
        previousStatus: null,
      },
      days: [
        {
          id: "day-1",
          routineId: "routine-1",
          label: "Lunes",
          weekday: 1,
          sortOrder: 1,
          isActive: true,
        },
      ],
      exerciseCount: 1,
      routineExercises: [
        {
          id: "re-1",
          routineDayId: "day-1",
          exerciseId: "ex-1",
          sortOrder: 1,
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 12,
          targetRir: 2,
          restSeconds: 90,
          notes: "",
          targetWeightKg: 45.5, // Target weight is configured!
        },
      ],
    };

    const routineRevision: RoutineRevision = {
      id: "rev-1",
      routineId: "routine-1",
      revisionNumber: 1,
      effectiveFrom: "2026-06-20T00:00:00.000Z",
      effectiveTo: null,
      snapshot: {
        routine: summary.routine,
        routineDays: summary.days,
        routineExercises: summary.routineExercises,
      },
    };

    const draft = buildWorkoutDraftFromRoutine(summary, routineRevision, exercises);

    expect(draft.setLogs).toHaveLength(3);
    expect(draft.setLogs[0]).toMatchObject({
      exerciseId: "ex-1",
      weightKg: 45.5, // Auto-populated target weight!
      reps: 8,
      rir: 2,
      targetSnapshot: {
        targetSets: 3,
        targetWeightKg: 45.5,
      },
    });
  });
});
