import type { Exercise } from "../../domain";
import { normalizeExerciseName } from "../../domain";

export type ExerciseLibraryFilters = {
  query: string;
  muscle: string;
  equipment: string;
  tag: string;
};

export const ALL_EXERCISE_FILTER_VALUE = "all";

export function filterExerciseLibrary(
  exercises: Exercise[],
  filters: ExerciseLibraryFilters,
): Exercise[] {
  const normalizedQuery = normalizeFilterText(filters.query);
  const queryTerms = normalizedQuery.length > 0 ? normalizedQuery.split(" ") : [];
  const muscle = normalizeFilterText(filters.muscle);
  const equipment = normalizeFilterText(filters.equipment);
  const tag = normalizeFilterText(filters.tag);

  return exercises.filter((exercise) => {
    const muscleValues = normalizeValues([
      ...exercise.primaryMuscles,
      ...exercise.secondaryMuscles,
    ]);
    const equipmentValues = normalizeValues(exercise.equipment);
    const tagValues = normalizeValues(exercise.tags);

    if (muscle && !muscleValues.includes(muscle)) {
      return false;
    }

    if (equipment && !equipmentValues.includes(equipment)) {
      return false;
    }

    if (tag && !tagValues.includes(tag)) {
      return false;
    }

    if (queryTerms.length === 0) {
      return true;
    }

    const searchText = normalizeFilterText(
      [
        exercise.name,
        ...exercise.primaryMuscles,
        ...exercise.secondaryMuscles,
        ...exercise.equipment,
        ...exercise.tags,
      ].join(" "),
    );

    return queryTerms.every((term) => searchText.includes(term));
  });
}

export function getExerciseFilterOptions(exercises: Exercise[]): {
  muscles: string[];
  equipment: string[];
  tags: string[];
} {
  return {
    muscles: getUniqueSortedValues(
      exercises.flatMap((exercise) => [
        ...exercise.primaryMuscles,
        ...exercise.secondaryMuscles,
      ]),
    ),
    equipment: getUniqueSortedValues(
      exercises.flatMap((exercise) => exercise.equipment),
    ),
    tags: getUniqueSortedValues(exercises.flatMap((exercise) => exercise.tags)),
  };
}

export function hasActiveExerciseFilters(filters: ExerciseLibraryFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.muscle !== ALL_EXERCISE_FILTER_VALUE ||
    filters.equipment !== ALL_EXERCISE_FILTER_VALUE ||
    filters.tag !== ALL_EXERCISE_FILTER_VALUE
  );
}

function getUniqueSortedValues(values: string[]): string[] {
  const uniqueValues = new Map<string, string>();

  values.forEach((value) => {
    const normalizedValue = normalizeFilterText(value);
    if (normalizedValue.length > 0 && !uniqueValues.has(normalizedValue)) {
      uniqueValues.set(normalizedValue, value);
    }
  });

  return [...uniqueValues.values()].sort((a, b) => a.localeCompare(b, "es-MX"));
}

function normalizeValues(values: string[]): string[] {
  return values.map((value) => normalizeFilterText(value));
}

function normalizeFilterText(value: string): string {
  if (value === ALL_EXERCISE_FILTER_VALUE) {
    return "";
  }

  return normalizeExerciseName(value);
}
