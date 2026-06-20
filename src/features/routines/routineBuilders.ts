import type {
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineRevision,
  Weekday,
} from "../../domain";
import { createId, toIsoUtc } from "../../domain";
import type { RoutineCreateInput } from "./types";

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
