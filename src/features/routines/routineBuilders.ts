import type {
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineRevision,
  Weekday,
} from "../../domain";
import { createId, toIsoUtc } from "../../domain";
import type { RoutineCreateInput, RoutineSummary } from "./types";

export const ROUTINE_DAY_OPTIONS: Array<{
  label: string;
  shortLabel: string;
  weekday: Weekday;
}> = [
  { label: "Lunes", shortLabel: "Lun", weekday: 1 },
  { label: "Martes", shortLabel: "Mar", weekday: 2 },
  { label: "Miércoles", shortLabel: "Mié", weekday: 3 },
  { label: "Jueves", shortLabel: "Jue", weekday: 4 },
  { label: "Viernes", shortLabel: "Vie", weekday: 5 },
  { label: "Sábado", shortLabel: "Sáb", weekday: 6 },
  { label: "Domingo", shortLabel: "Dom", weekday: 0 },
];

export type RoutineGraphInput = RoutineCreateInput & {
  createdAt?: string;
};

export type RoutineExerciseDraftInput = {
  routineDayId: string;
  exerciseId: string;
  sortOrder: number;
};

export type RoutineEditGraphInput = {
  summary: RoutineSummary;
  routineExercises: RoutineExercise[];
  updatedAt?: string;
};

export const DEFAULT_ROUTINE_EXERCISE_TARGET = {
  targetSets: 3,
  targetRepsMin: 8,
  targetRepsMax: 12,
  targetRir: 2,
  restSeconds: 90,
} satisfies Pick<
  RoutineExercise,
  "targetSets" | "targetRepsMin" | "targetRepsMax" | "targetRir" | "restSeconds"
>;

export function buildRoutineGraph(input: RoutineGraphInput): {
  routine: Routine;
  routineDays: RoutineDay[];
  routineExercises: RoutineExercise[];
  routineRevision: RoutineRevision;
} {
  const createdAt = input.createdAt ?? toIsoUtc();
  const routineId = createId();
  const routine: Routine = {
    id: routineId,
    name: input.name.trim(),
    goal: input.goal.trim(),
    status: "active",
    manualOrder: input.manualOrder,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    previousStatus: null,
  };
  const routineDays = input.selectedDayIndexes.map((dayIndex, index) => {
    const dayOption = ROUTINE_DAY_OPTIONS[dayIndex];

    return {
      id: createId(),
      routineId,
      label: dayOption.label,
      weekday: dayOption.weekday,
      sortOrder: index + 1,
      isActive: true,
    };
  });
  const routineExercises: RoutineExercise[] = [];
  const routineRevision: RoutineRevision = {
    id: createId(),
    routineId,
    revisionNumber: 1,
    effectiveFrom: createdAt,
    effectiveTo: null,
    snapshot: {
      routine,
      routineDays,
      routineExercises,
    },
  };

  return {
    routine,
    routineDays,
    routineExercises,
    routineRevision,
  };
}

export function createRoutineExerciseDraft(
  input: RoutineExerciseDraftInput,
): RoutineExercise {
  return {
    id: createId(),
    routineDayId: input.routineDayId,
    exerciseId: input.exerciseId,
    sortOrder: input.sortOrder,
    ...DEFAULT_ROUTINE_EXERCISE_TARGET,
    notes: "",
  };
}

export function buildRoutineEditGraph(input: RoutineEditGraphInput): {
  routine: Routine;
  routineDays: RoutineDay[];
  routineExercises: RoutineExercise[];
} {
  const updatedAt = input.updatedAt ?? toIsoUtc();
  const routineDays = [...input.summary.days].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    routine: {
      ...input.summary.routine,
      updatedAt,
    },
    routineDays,
    routineExercises: normalizeRoutineExercisesForDays(input.routineExercises, routineDays),
  };
}

export function normalizeRoutineExercisesForDays(
  routineExercises: RoutineExercise[],
  routineDays: RoutineDay[],
): RoutineExercise[] {
  const dayIds = new Set(routineDays.map((routineDay) => routineDay.id));

  return routineDays.flatMap((routineDay) =>
    routineExercises
      .filter((routineExercise) => routineExercise.routineDayId === routineDay.id)
      .filter((routineExercise) => dayIds.has(routineExercise.routineDayId))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((routineExercise, index) =>
        normalizeRoutineExerciseTarget({
          ...routineExercise,
          sortOrder: index + 1,
        }),
      ),
  );
}

export function moveRoutineExerciseInDay(
  routineExercises: RoutineExercise[],
  routineDayId: string,
  routineExerciseId: string,
  direction: -1 | 1,
): RoutineExercise[] {
  const dayExercises = routineExercises
    .filter((routineExercise) => routineExercise.routineDayId === routineDayId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = dayExercises.findIndex(
    (routineExercise) => routineExercise.id === routineExerciseId,
  );
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= dayExercises.length) {
    return routineExercises;
  }

  const nextDayExercises = [...dayExercises];
  [nextDayExercises[currentIndex], nextDayExercises[nextIndex]] = [
    nextDayExercises[nextIndex],
    nextDayExercises[currentIndex],
  ];
  const reorderedById = new Map(
    nextDayExercises.map((routineExercise, index) => [
      routineExercise.id,
      {
        ...routineExercise,
        sortOrder: index + 1,
      },
    ]),
  );

  return routineExercises.map(
    (routineExercise) => reorderedById.get(routineExercise.id) ?? routineExercise,
  );
}

export function removeRoutineExerciseFromDay(
  routineExercises: RoutineExercise[],
  routineDayId: string,
  routineExerciseId: string,
): RoutineExercise[] {
  const remainingExercises = routineExercises.filter(
    (routineExercise) => routineExercise.id !== routineExerciseId,
  );
  const dayExercises = remainingExercises
    .filter((routineExercise) => routineExercise.routineDayId === routineDayId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((routineExercise, index) => ({
      ...routineExercise,
      sortOrder: index + 1,
    }));
  const reorderedById = new Map(
    dayExercises.map((routineExercise) => [routineExercise.id, routineExercise]),
  );

  return remainingExercises.map(
    (routineExercise) => reorderedById.get(routineExercise.id) ?? routineExercise,
  );
}

function normalizeRoutineExerciseTarget(routineExercise: RoutineExercise): RoutineExercise {
  const targetRepsMin = toPositiveInteger(routineExercise.targetRepsMin, 1);
  const targetRepsMax = Math.max(
    targetRepsMin,
    toPositiveInteger(routineExercise.targetRepsMax, targetRepsMin),
  );

  return {
    ...routineExercise,
    targetSets: toPositiveInteger(routineExercise.targetSets, 1),
    targetRepsMin,
    targetRepsMax,
    targetRir:
      routineExercise.targetRir === null
        ? null
        : toNonNegativeInteger(routineExercise.targetRir, 0),
    restSeconds: toNonNegativeInteger(routineExercise.restSeconds, 0),
  };
}

function toPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.round(value) : fallback;
}

function toNonNegativeInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}
