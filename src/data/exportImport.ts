import type {
  AppMetaRecord,
  Exercise,
  Routine,
  RoutineDay,
  RoutineExercise,
  RoutineRevision,
  SetLog,
  Settings,
  WorkoutSession,
} from "../domain/types";
import { toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";
import { CORE_STORE_NAMES } from "./storeNames";

export const EXPORT_FORMAT = "rutina-ejercicio.export";
export const EXPORT_SCHEMA_VERSION = 1;

export type DatabaseExportData = {
  meta: AppMetaRecord[];
  exercises: Exercise[];
  routines: Routine[];
  routineDays: RoutineDay[];
  routineExercises: RoutineExercise[];
  routineRevisions: RoutineRevision[];
  workoutSessions: WorkoutSession[];
  setLogs: SetLog[];
  settings: Settings[];
};

export type DatabaseExport = {
  format: typeof EXPORT_FORMAT;
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  data: DatabaseExportData;
};

export type ImportValidationResult =
  | {
      ok: true;
      value: DatabaseExport;
    }
  | {
      ok: false;
      error: string;
    };

export function createEmptyExportData(): DatabaseExportData {
  return {
    meta: [],
    exercises: [],
    routines: [],
    routineDays: [],
    routineExercises: [],
    routineRevisions: [],
    workoutSessions: [],
    setLogs: [],
    settings: [],
  };
}

export function createDatabaseExport(
  data: DatabaseExportData,
  exportedAt = toIsoUtc(),
): DatabaseExport {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt,
    data,
  };
}

export async function readDatabaseExportData(
  db: WorkoutDatabase = appDb,
): Promise<DatabaseExportData> {
  return {
    meta: await db.meta.toArray(),
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    routineDays: await db.routineDays.toArray(),
    routineExercises: await db.routineExercises.toArray(),
    routineRevisions: await db.routineRevisions.toArray(),
    workoutSessions: await db.workoutSessions.toArray(),
    setLogs: await db.setLogs.toArray(),
    settings: await db.settings.toArray(),
  };
}

export async function exportDatabaseJson(db: WorkoutDatabase = appDb): Promise<DatabaseExport> {
  return createDatabaseExport(await readDatabaseExportData(db));
}

export function stringifyDatabaseExport(exportPayload: DatabaseExport): string {
  return JSON.stringify(exportPayload, null, 2);
}

export function validateImportPayload(payload: unknown): ImportValidationResult {
  if (!isRecord(payload)) {
    return { ok: false, error: "El respaldo no es un objeto JSON válido." };
  }

  if (payload.format !== EXPORT_FORMAT) {
    return { ok: false, error: "El formato del respaldo no es compatible." };
  }

  if (payload.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    if (
      typeof payload.schemaVersion === "number" &&
      payload.schemaVersion > EXPORT_SCHEMA_VERSION
    ) {
      return {
        ok: false,
        error: "El respaldo usa una versión futura del esquema.",
      };
    }

    return { ok: false, error: "La versión del esquema no es compatible." };
  }

  if (typeof payload.exportedAt !== "string" || payload.exportedAt.length === 0) {
    return { ok: false, error: "El respaldo no incluye fecha de exportación." };
  }

  if (!isRecord(payload.data)) {
    return { ok: false, error: "El respaldo no incluye datos importables." };
  }

  for (const storeName of CORE_STORE_NAMES) {
    if (!Array.isArray(payload.data[storeName])) {
      return { ok: false, error: `El store ${storeName} no es válido.` };
    }
  }

  return { ok: true, value: payload as DatabaseExport };
}

export function parseImportJson(input: string): ImportValidationResult {
  try {
    return validateImportPayload(JSON.parse(input));
  } catch {
    return { ok: false, error: "El respaldo no es JSON válido." };
  }
}

export async function replaceDatabaseFromExport(
  input: string | DatabaseExport,
  db: WorkoutDatabase = appDb,
): Promise<DatabaseExport> {
  const validation = typeof input === "string" ? parseImportJson(input) : validateImportPayload(input);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const { data } = validation.value;

  await db.transaction(
    "rw",
    [
      db.meta,
      db.exercises,
      db.routines,
      db.routineDays,
      db.routineExercises,
      db.routineRevisions,
      db.workoutSessions,
      db.setLogs,
      db.settings,
    ],
    async () => {
      await db.meta.clear();
      await db.exercises.clear();
      await db.routines.clear();
      await db.routineDays.clear();
      await db.routineExercises.clear();
      await db.routineRevisions.clear();
      await db.workoutSessions.clear();
      await db.setLogs.clear();
      await db.settings.clear();

      await db.meta.bulkPut(data.meta);
      await db.exercises.bulkPut(data.exercises);
      await db.routines.bulkPut(data.routines);
      await db.routineDays.bulkPut(data.routineDays);
      await db.routineExercises.bulkPut(data.routineExercises);
      await db.routineRevisions.bulkPut(data.routineRevisions);
      await db.workoutSessions.bulkPut(data.workoutSessions);
      await db.setLogs.bulkPut(data.setLogs);
      await db.settings.bulkPut(data.settings);
    },
  );

  return validation.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
