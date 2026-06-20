import type {
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineRevision,
  RoutineStatus,
} from "../domain/types";
import { createId, toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";

export type RoutineGraph = {
  routine: Routine;
  routineDays: RoutineDay[];
  routineExercises: RoutineExercise[];
  routineRevision: RoutineRevision;
};

export type ManualOrderUpdate = {
  routineId: string;
  manualOrder: number;
  updatedAt?: string;
};

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
  return db.transaction("rw", db.routines, db.routineRevisions, async () => {
    const routine = await db.routines.get(id);
    if (!routine) {
      return 0;
    }

    const previousStatus =
      routine.status === "deleted" ? routine.previousStatus : toPreviousStatus(routine.status);

    const routineUpdateCount = await db.routines.update(id, {
      status: "deleted",
      previousStatus,
      deletedAt,
      updatedAt: deletedAt,
    });

    await closeOpenRoutineRevisions(id, deletedAt, db);

    return routineUpdateCount;
  });
}

export async function restoreRoutine(
  id: string,
  restoredAt = toIsoUtc(),
  db: WorkoutDatabase = appDb,
): Promise<number> {
  return db.transaction(
    "rw",
    db.routines,
    db.routineDays,
    db.routineExercises,
    db.routineRevisions,
    async () => {
      const routine = await db.routines.get(id);
      if (!routine || routine.status !== "deleted") {
        return 0;
      }

      const restoredRoutine: Routine = {
        ...routine,
        status: routine.previousStatus ?? "paused",
        previousStatus: null,
        deletedAt: null,
        updatedAt: restoredAt,
      };

      const routineUpdateCount = await db.routines.put(restoredRoutine);
      await createRoutineRevisionWindow(restoredRoutine, restoredAt, db);

      return routineUpdateCount ? 1 : 0;
    },
  );
}

export async function saveRoutineGraph(
  graph: RoutineGraph,
  db: WorkoutDatabase = appDb,
): Promise<void> {
  await db.transaction(
    "rw",
    db.routines,
    db.routineDays,
    db.routineExercises,
    db.routineRevisions,
    async () => {
      await db.routines.put(graph.routine);
      await db.routineDays.bulkPut(graph.routineDays);
      await db.routineExercises.bulkPut(graph.routineExercises);
      await db.routineRevisions.put(graph.routineRevision);
    },
  );
}

export async function updateRoutineManualOrders(
  updates: ManualOrderUpdate[],
  db: WorkoutDatabase = appDb,
): Promise<number> {
  const updatedAt = toIsoUtc();

  return db.transaction("rw", db.routines, async () => {
    let updatedCount = 0;

    for (const update of updates) {
      updatedCount += await db.routines.update(update.routineId, {
        manualOrder: update.manualOrder,
        updatedAt: update.updatedAt ?? updatedAt,
      });
    }

    return updatedCount;
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

async function closeOpenRoutineRevisions(
  routineId: string,
  effectiveTo: string,
  db: WorkoutDatabase,
): Promise<number> {
  return db.routineRevisions
    .where("routineId")
    .equals(routineId)
    .filter((revision) => revision.effectiveTo === null)
    .modify({ effectiveTo });
}

async function createRoutineRevisionWindow(
  routine: Routine,
  effectiveFrom: string,
  db: WorkoutDatabase,
): Promise<string> {
  await closeOpenRoutineRevisions(routine.id, effectiveFrom, db);

  const existingRevisions = await db.routineRevisions
    .where("routineId")
    .equals(routine.id)
    .toArray();
  const revisionNumber =
    existingRevisions.reduce(
      (highest, revision) => Math.max(highest, revision.revisionNumber),
      0,
    ) + 1;
  const routineDays = await listRoutineDays(routine.id, db);
  const routineExercises = (
    await Promise.all(
      routineDays.map((routineDay) => listRoutineExercisesForDay(routineDay.id, db)),
    )
  ).flat();
  const routineRevision: RoutineRevision = {
    id: createId(),
    routineId: routine.id,
    revisionNumber,
    effectiveFrom,
    effectiveTo: null,
    snapshot: {
      routine,
      routineDays,
      routineExercises,
    },
  };

  await db.routineRevisions.put(routineRevision);
  return routineRevision.id;
}
