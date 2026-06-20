import {
  listActiveRoutines,
  listRoutineDays,
  listRoutineExercisesForDay,
  listRoutines,
} from "../../data";
import type { Routine } from "../../domain";
import type { RoutineSummary } from "./types";

export async function loadRoutineSummaries(): Promise<RoutineSummary[]> {
  const routines = await listRoutines();
  return Promise.all(routines.map((routine) => loadRoutineSummary(routine)));
}

export async function loadHighestPriorityActiveRoutine(): Promise<RoutineSummary | null> {
  const activeRoutines = await listActiveRoutines();
  const [firstRoutine] = activeRoutines;

  if (!firstRoutine) {
    return null;
  }

  return loadRoutineSummary(firstRoutine);
}

async function loadRoutineSummary(routine: Routine): Promise<RoutineSummary> {
  const days = await listRoutineDays(routine.id);
  const routineExerciseGroups = await Promise.all(
    days.map((day) => listRoutineExercisesForDay(day.id)),
  );
  const routineExercises = routineExerciseGroups.flat();

  return {
    routine,
    days,
    routineExercises,
    exerciseCount: routineExercises.length,
  };
}
