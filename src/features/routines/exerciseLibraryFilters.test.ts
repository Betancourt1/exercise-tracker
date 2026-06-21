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
        query: "jalon",
      }).map((exercise) => exercise.name),
    ).toContain("Jalón al pecho");

    expect(
      filterExerciseLibrary(exercises, {
        ...baseFilters,
        query: "  MAQUINA pecho  ",
      }).map((exercise) => exercise.name),
    ).toEqual(expect.arrayContaining(["Press de pecho en máquina"]));

    expect(
      filterExerciseLibrary(exercises, {
        ...baseFilters,
        query: "polea alta",
      }).map((exercise) => exercise.name),
    ).toEqual(expect.arrayContaining(["Jalón al pecho", "Crunch en polea"]));
  });

  it("combines query, muscle, equipment, and tag filters", () => {
    const exercises = createSeedExercises("2026-06-20T00:00:00.000Z");
    const results = filterExerciseLibrary(exercises, {
      query: "press",
      muscle: "pecho",
      equipment: "mancuernas",
      tag: "hipertrofia",
    });

    expect(results.map((exercise) => exercise.name)).toEqual(
      expect.arrayContaining([
        "Press inclinado con mancuernas",
        "Press con mancuernas en banca plana",
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
      expect.arrayContaining(["banda", "máquina", "mancuernas"]),
    );
    expect(options.tags).toEqual(
      expect.arrayContaining(["principiante", "hipertrofia", "sin máquinas"]),
    );
    expect(options.muscles).toEqual(
      [...options.muscles].sort((a, b) => a.localeCompare(b, "es-MX")),
    );
  });
});
