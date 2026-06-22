import { describe, expect, it } from "vitest";
import type { RoutineExercise } from "../../domain";
import { createSeedExercises } from "../../data";
import {
  buildRoutineEditGraph,
  buildRoutineGraph,
  createRoutineExerciseDraft,
  moveRoutineExerciseInDay,
  removeRoutineExerciseFromDay,
} from "./routineBuilders";
import { ROUTINE_PRESETS, buildRoutineGraphFromPreset } from "./routinePresets";
import type { RoutineSummary } from "./types";

describe("routine graph builder", () => {
  it("creates an active routine graph with days and revision snapshot", () => {
    const graph = buildRoutineGraph({
      name: " Fuerza 4 días ",
      goal: "Fuerza",
      selectedDayIndexes: [0, 2],
      manualOrder: 3,
      createdAt: "2026-06-20T00:00:00.000Z",
    });

    expect(graph.routine).toMatchObject({
      name: "Fuerza 4 días",
      goal: "Fuerza",
      status: "active",
      manualOrder: 3,
    });
    expect(graph.routineDays).toHaveLength(2);
    expect(graph.routineDays[0]).toMatchObject({
      label: "Lunes",
      weekday: 1,
      sortOrder: 1,
      isActive: true,
    });
    expect(graph.routineExercises).toEqual([]);
    expect(graph.routineRevision.snapshot.routine.id).toBe(graph.routine.id);
    expect(graph.routineRevision.snapshot.routineDays).toHaveLength(2);
  });

  it("creates routine exercises with default targets", () => {
    const routineExercise = createRoutineExerciseDraft({
      routineDayId: "routine-day-1",
      exerciseId: "exercise-1",
      sortOrder: 2,
    });

    expect(routineExercise).toMatchObject({
      routineDayId: "routine-day-1",
      exerciseId: "exercise-1",
      sortOrder: 2,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetRir: 2,
      restSeconds: 90,
      notes: "",
      targetWeightKg: null,
    });
  });

  it("moves and removes exercises within a routine day", () => {
    const firstExercise = createRoutineExercise("routine-exercise-1", 1);
    const secondExercise = createRoutineExercise("routine-exercise-2", 2);
    const thirdExercise = createRoutineExercise("routine-exercise-3", 3);

    const movedExercises = moveRoutineExerciseInDay(
      [firstExercise, secondExercise, thirdExercise],
      "routine-day-1",
      "routine-exercise-3",
      -1,
    );

    expect(
      movedExercises
        .filter((routineExercise) => routineExercise.routineDayId === "routine-day-1")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((routineExercise) => routineExercise.id),
    ).toEqual(["routine-exercise-1", "routine-exercise-3", "routine-exercise-2"]);

    const remainingExercises = removeRoutineExerciseFromDay(
      movedExercises,
      "routine-day-1",
      "routine-exercise-3",
    );

    expect(
      remainingExercises
        .filter((routineExercise) => routineExercise.routineDayId === "routine-day-1")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((routineExercise) => ({
          id: routineExercise.id,
          sortOrder: routineExercise.sortOrder,
        })),
    ).toEqual([
      { id: "routine-exercise-1", sortOrder: 1 },
      { id: "routine-exercise-2", sortOrder: 2 },
    ]);
  });

  it("builds an edited routine graph with normalized exercises", () => {
    const summary = createRoutineSummary();
    const editedGraph = buildRoutineEditGraph({
      summary,
      updatedAt: "2026-06-21T00:00:00.000Z",
      routineExercises: [
        {
          ...createRoutineExercise("routine-exercise-2", 4),
          targetSets: 0,
          targetRepsMin: 12,
          targetRepsMax: 8,
          restSeconds: Number.NaN,
        },
        createRoutineExercise("routine-exercise-1", 2),
      ],
    });

    expect(editedGraph.routine.updatedAt).toBe("2026-06-21T00:00:00.000Z");
    expect(editedGraph.routineDays.map((routineDay) => routineDay.id)).toEqual([
      "routine-day-1",
    ]);
    expect(
      editedGraph.routineExercises.map((routineExercise) => ({
        id: routineExercise.id,
        sortOrder: routineExercise.sortOrder,
        targetSets: routineExercise.targetSets,
        targetRepsMin: routineExercise.targetRepsMin,
        targetRepsMax: routineExercise.targetRepsMax,
        restSeconds: routineExercise.restSeconds,
      })),
    ).toEqual([
      {
        id: "routine-exercise-1",
        sortOrder: 1,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
      },
      {
        id: "routine-exercise-2",
        sortOrder: 2,
        targetSets: 1,
        targetRepsMin: 12,
        targetRepsMax: 12,
        restSeconds: 0,
      },
    ]);
  });

  it("builds editable routine graphs from every preset", () => {
    const exercises = createSeedExercises("2026-06-20T00:00:00.000Z");

    for (const [index, preset] of ROUTINE_PRESETS.entries()) {
      const graph = buildRoutineGraphFromPreset(
        preset,
        exercises,
        index + 1,
        "2026-06-20T00:00:00.000Z",
      );

      expect(graph.routine).toMatchObject({
        name: preset.name,
        goal: preset.goal,
        status: "active",
        manualOrder: index + 1,
      });
      expect(graph.routineDays).toHaveLength(preset.days.length);
      expect(graph.routineExercises).toHaveLength(
        preset.days.reduce((total, day) => total + day.exercises.length, 0),
      );
      expect(graph.routineRevision.snapshot.routineExercises).toEqual(
        graph.routineExercises,
      );
    }
  });
});

function createRoutineSummary(): RoutineSummary {
  return {
    routine: {
      id: "routine-1",
      name: "Fuerza 4 días",
      goal: "Fuerza",
      status: "active",
      manualOrder: 1,
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      deletedAt: null,
      previousStatus: null,
    },
    days: [
      {
        id: "routine-day-1",
        routineId: "routine-1",
        label: "Lunes",
        weekday: 1,
        sortOrder: 1,
        isActive: true,
      },
    ],
    exerciseCount: 0,
    routineExercises: [],
  };
}

function createRoutineExercise(id: string, sortOrder: number): RoutineExercise {
  return {
    id,
    routineDayId: "routine-day-1",
    exerciseId: "exercise-1",
    sortOrder,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetRir: 2,
    restSeconds: 90,
    notes: "",
    targetWeightKg: null,
  };
}
