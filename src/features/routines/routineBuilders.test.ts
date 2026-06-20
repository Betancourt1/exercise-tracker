import { describe, expect, it } from "vitest";
import { buildRoutineGraph } from "./routineBuilders";

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
});
