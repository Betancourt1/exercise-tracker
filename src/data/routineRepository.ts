import type { Routine, RoutineDay, RoutineExercise, RoutineStatus } from "../domain/types";
import { toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";

export async function listRoutines(
  options: { includeDeleted?: boolean } = {},
  db: WorkoutDatabase = appDb,
): Promise<Routine[]> {
  const routines = await db.routines.orderBy("manualOrder").toArray();
  return options.includeDeleted
    ? routines
    : routines.filter((routine) => routine.status !== "deleted");
}

export async function listActiveRoutines(db: WorkoutDatabase = appDb): Promise<Routine[]> {
  return db.routines.where("status").equals("active").sortBy("manualOrder");
}

export async function getRoutine(
  id: string,
  db: WorkoutDatabase = appDb,
): Promise<Routine | undefined> {
  return db.routines.get(id);
}

export async function saveRoutine(
  routine: Routine,
  db: WorkoutDatabase = appDb,
): Promise<string> {
  return db.routines.put(routine);
}

export async function softDeleteRoutine(
  id: string,
  deletedAt = toIsoUtc(),
  db: WorkoutDatabase = appDb,
): Promise<number> {
  const routine = await db.routines.get(id);
  if (!routine) {
    return 0;
  }

  const previousStatus =
    routine.status === "deleted" ? routine.previousStatus : toPreviousStatus(routine.status);

  return db.routines.update(id, {
    status: "deleted",
    previousStatus,
    deletedAt,
    updatedAt: deletedAt,
  });
}

export async function restoreRoutine(
  id: string,
  restoredAt = toIsoUtc(),
  db: WorkoutDatabase = appDb,
): Promise<number> {
  const routine = await db.routines.get(id);
  if (!routine || routine.status !== "deleted") {
    return 0;
  }

  return db.routines.update(id, {
    status: routine.previousStatus ?? "paused",
    previousStatus: null,
    deletedAt: null,
    updatedAt: restoredAt,
  });
}

export async function listRoutineDays(
  routineId: string,
  db: WorkoutDatabase = appDb,
): Promise<RoutineDay[]> {
  const routineDays = await db.routineDays.where("routineId").equals(routineId).toArray();
  return routineDays.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveRoutineDay(
  routineDay: RoutineDay,
  db: WorkoutDatabase = appDb,
): Promise<string> {
  return db.routineDays.put(routineDay);
}

export async function listRoutineExercisesForDay(
  routineDayId: string,
  db: WorkoutDatabase = appDb,
): Promise<RoutineExercise[]> {
  const routineExercises = await db.routineExercises
    .where("routineDayId")
    .equals(routineDayId)
    .toArray();

  return routineExercises.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveRoutineExercise(
  routineExercise: RoutineExercise,
  db: WorkoutDatabase = appDb,
): Promise<string> {
  return db.routineExercises.put(routineExercise);
}

function toPreviousStatus(status: RoutineStatus): "draft" | "active" | "paused" | null {
  return status === "deleted" ? null : status;
}
