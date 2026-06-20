import type { Routine, RoutineDay, RoutineExercise } from "../../domain";

export type RoutineSummary = {
  routine: Routine;
  days: RoutineDay[];
  exerciseCount: number;
  routineExercises: RoutineExercise[];
};

export type RoutineCreateInput = {
  name: string;
  goal: string;
  selectedDayIndexes: number[];
  manualOrder: number;
};
