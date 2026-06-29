import { describe, expect, it } from "vitest";
import { createSeedExercises } from "../../data";
import {
  ALL_EXERCISE_FILTER_VALUE,
  filterExerciseLibrary,
  getExerciseFilterOptions,
} from "./exerciseLibraryFilters";

const baseFilters = {
  query: "",
  muscle: ALL_EXERCISE_FILTER_VALUE,
  equipment: ALL_EXERCISE_FILTER_VALUE,
  tag: ALL_EXERCISE_FILTER_VALUE,
};

describe("exercise library filters", () => {
  it("matches names and metadata without requiring accents", () => {
    const exercises = createSeedExercises("2026-06-20T00:00:00.000Z");

    expect(
      filterExerciseLibrary(exercises, {
        ...baseFilters,
        query: "pulldown",
      }).map((exercise) => exercise.name),
    ).toContain("cable lat pulldown full range of motion");

    expect(
      filterExerciseLibrary(exercises, {
        ...baseFilters,
        query: "  MAQUINA pecho  ",
      }).map((exercise) => exercise.name),
    ).toEqual(expect.arrayContaining(["lever chest press (0577)"]));

    expect(
      filterExerciseLibrary(exercises, {
        ...baseFilters,
        query: "polea core",
      }).map((exercise) => exercise.name),
    ).toEqual(expect.arrayContaining(["cable kneeling crunch"]));
  });

  it("combines query, muscle, equipment, and tag filters", () => {
    const exercises = createSeedExercises("2026-06-20T00:00:00.000Z");
    const results = filterExerciseLibrary(exercises, {
      query: "press",
      muscle: "pecho",
      equipment: "mancuerna",
      tag: "pecho",
    });

    expect(results.map((exercise) => exercise.name)).toEqual(
      expect.arrayContaining([
        "dumbbell incline bench press",
        "dumbbell bench press",
      ]),
    );
    expect(
      results.every(
        (exercise) =>
          exercise.primaryMuscles.includes("pecho") ||
          exercise.secondaryMuscles.includes("pecho"),
      ),
    ).toBe(true);
  });

  it("derives sorted filter options from the available exercise library", () => {
    const options = getExerciseFilterOptions(
      createSeedExercises("2026-06-20T00:00:00.000Z"),
    );

    expect(options.muscles).toEqual(expect.arrayContaining(["pecho", "core"]));
    expect(options.equipment).toEqual(
      expect.arrayContaining(["banda", "máquina", "mancuerna"]),
    );
    expect(options.tags).toEqual(
      expect.arrayContaining(["pecho", "core", "mancuerna"]),
    );
    expect(options.muscles).toEqual(
      [...options.muscles].sort((a, b) => a.localeCompare(b, "es-MX")),
    );
  });
});
