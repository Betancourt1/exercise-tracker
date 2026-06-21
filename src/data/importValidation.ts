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
import type { DatabaseExportData } from "./exportImport";

const routineStatuses = new Set(["draft", "active", "paused", "deleted"]);
const previousRoutineStatuses = new Set(["draft", "active", "paused"]);
const sessionStatuses = new Set(["in_progress", "completed", "discarded"]);
const sessionSources = new Set(["routine", "manual"]);
const unitSystems = new Set(["metric", "imperial"]);
const themes = new Set(["system", "light", "dark"]);

export type DataValidationResult =
  | {
      ok: true;
      value: DatabaseExportData;
    }
  | {
      ok: false;
      error: string;
    };

export function validateExportData(data: unknown): DataValidationResult {
  if (!isRecord(data)) {
    return invalid("El respaldo no incluye datos importables.");
  }

  const storeValidation = validateStoreArrays(data);
  if (!storeValidation.ok) {
    return storeValidation;
  }

  const exportData = storeValidation.value;
  const entityValidation =
    validateMeta(exportData.meta) ??
    validateExercises(exportData.exercises) ??
    validateRoutines(exportData.routines) ??
    validateRoutineDays(exportData.routineDays) ??
    validateRoutineExercises(exportData.routineExercises) ??
    validateRoutineRevisions(exportData.routineRevisions) ??
    validateWorkoutSessions(exportData.workoutSessions) ??
    validateSetLogs(exportData.setLogs) ??
    validateSettings(exportData.settings) ??
    validateReferences(exportData);

  if (entityValidation) {
    return invalid(entityValidation);
  }

  return { ok: true, value: exportData };
}

function validateStoreArrays(data: Record<string, unknown>): DataValidationResult {
  const expectedStores: Array<keyof DatabaseExportData> = [
    "meta",
    "exercises",
    "routines",
    "routineDays",
    "routineExercises",
    "routineRevisions",
    "workoutSessions",
    "setLogs",
    "settings",
  ];

  for (const storeName of expectedStores) {
    if (!Array.isArray(data[storeName])) {
      return invalid(`El store ${storeName} no es válido.`);
    }
  }

  return {
    ok: true,
    value: {
      meta: data.meta as AppMetaRecord[],
      exercises: data.exercises as Exercise[],
      routines: data.routines as Routine[],
      routineDays: data.routineDays as RoutineDay[],
      routineExercises: data.routineExercises as RoutineExercise[],
      routineRevisions: data.routineRevisions as RoutineRevision[],
      workoutSessions: data.workoutSessions as WorkoutSession[],
      setLogs: data.setLogs as SetLog[],
      settings: data.settings as Settings[],
    },
  };
}

function validateMeta(records: AppMetaRecord[]): string | null {
  return firstError(records, "meta", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!isFiniteNumber(record.schemaVersion)) return "requiere schemaVersion numérico";
    if (!isNonEmptyString(record.createdAt)) return "requiere createdAt";
    if (!isNonEmptyString(record.updatedAt)) return "requiere updatedAt";
    return null;
  });
}

function validateExercises(records: Exercise[]): string | null {
  return firstError(records, "exercises", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!isNonEmptyString(record.name)) return "requiere name";
    if (!isNonEmptyString(record.nameNormalized)) return "requiere nameNormalized";
    if (!isStringArray(record.primaryMuscles)) return "requiere primaryMuscles";
    if (!isStringArray(record.secondaryMuscles)) return "requiere secondaryMuscles";
    if (!isStringArray(record.equipment)) return "requiere equipment";
    if (
      record.equipmentDetail !== undefined &&
      typeof record.equipmentDetail !== "string"
    ) {
      return "equipmentDetail debe ser string";
    }
    if (!isStringArray(record.tags)) return "requiere tags";
    if (!isGuide(record.guide)) return "requiere guide válido";
    if (typeof record.isCustom !== "boolean") return "requiere isCustom";
    if (!isNullableString(record.archivedAt)) return "archivedAt debe ser string o null";
    if (!isNonEmptyString(record.createdAt)) return "requiere createdAt";
    if (!isNonEmptyString(record.updatedAt)) return "requiere updatedAt";
    return null;
  });
}

function validateRoutines(records: Routine[]): string | null {
  return firstError(records, "routines", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!isNonEmptyString(record.name)) return "requiere name";
    if (typeof record.goal !== "string") return "requiere goal";
    if (!routineStatuses.has(String(record.status))) return "status no es válido";
    if (!isFiniteNumber(record.manualOrder)) return "requiere manualOrder numérico";
    if (!isNonEmptyString(record.createdAt)) return "requiere createdAt";
    if (!isNonEmptyString(record.updatedAt)) return "requiere updatedAt";
    if (!isNullableString(record.deletedAt)) return "deletedAt debe ser string o null";
    if (
      record.previousStatus !== null &&
      !previousRoutineStatuses.has(String(record.previousStatus))
    ) {
      return "previousStatus no es válido";
    }
    return null;
  });
}

function validateRoutineDays(records: RoutineDay[]): string | null {
  return firstError(records, "routineDays", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!isNonEmptyString(record.routineId)) return "requiere routineId";
    if (!isNonEmptyString(record.label)) return "requiere label";
    if (record.weekday !== null && !isWeekday(record.weekday)) return "weekday no es válido";
    if (!isFiniteNumber(record.sortOrder)) return "requiere sortOrder numérico";
    if (typeof record.isActive !== "boolean") return "requiere isActive";
    return null;
  });
}

function validateRoutineExercises(records: RoutineExercise[]): string | null {
  return firstError(records, "routineExercises", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!isNonEmptyString(record.routineDayId)) return "requiere routineDayId";
    if (!isNonEmptyString(record.exerciseId)) return "requiere exerciseId";
    if (!isFiniteNumber(record.sortOrder)) return "requiere sortOrder numérico";
    if (!isPositiveInteger(record.targetSets)) return "requiere targetSets válido";
    if (!isPositiveInteger(record.targetRepsMin)) return "requiere targetRepsMin válido";
    if (!isPositiveInteger(record.targetRepsMax)) return "requiere targetRepsMax válido";
    if (record.targetRepsMax < record.targetRepsMin) return "targetRepsMax menor a targetRepsMin";
    if (record.targetRir !== null && !isFiniteNumber(record.targetRir)) return "targetRir inválido";
    if (!isFiniteNumber(record.restSeconds) || record.restSeconds < 0) return "restSeconds inválido";
    if (typeof record.notes !== "string") return "requiere notes";
    return null;
  });
}

function validateRoutineRevisions(records: RoutineRevision[]): string | null {
  return firstError(records, "routineRevisions", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!isNonEmptyString(record.routineId)) return "requiere routineId";
    if (!isPositiveInteger(record.revisionNumber)) return "revisionNumber no es válido";
    if (!isNonEmptyString(record.effectiveFrom)) return "requiere effectiveFrom";
    if (!isNullableString(record.effectiveTo)) return "effectiveTo debe ser string o null";
    const snapshotError = validateRoutineRevisionSnapshot(record);
    if (snapshotError) return snapshotError;
    return null;
  });
}

function validateRoutineRevisionSnapshot(record: RoutineRevision): string | null {
  if (!isRecord(record.snapshot)) return "requiere snapshot";
  if (!isRecord(record.snapshot.routine)) return "snapshot.routine no es válido";
  if (!Array.isArray(record.snapshot.routineDays)) {
    return "snapshot.routineDays no es válido";
  }
  if (!Array.isArray(record.snapshot.routineExercises)) {
    return "snapshot.routineExercises no es válido";
  }

  const routineError = validateRoutines([record.snapshot.routine]);
  if (routineError) return `snapshot.${routineError}`;

  if (record.snapshot.routine.id !== record.routineId) {
    return "snapshot.routine no coincide con routineId";
  }

  const routineDaysError = validateRoutineDays(record.snapshot.routineDays);
  if (routineDaysError) return `snapshot.${routineDaysError}`;

  const routineExercisesError = validateRoutineExercises(record.snapshot.routineExercises);
  if (routineExercisesError) return `snapshot.${routineExercisesError}`;

  const snapshotDayIds = new Set(record.snapshot.routineDays.map((day) => day.id));
  for (const routineDay of record.snapshot.routineDays) {
    if (routineDay.routineId !== record.routineId) {
      return "snapshot.routineDays apunta a otra rutina";
    }
  }

  for (const routineExercise of record.snapshot.routineExercises) {
    if (!snapshotDayIds.has(routineExercise.routineDayId)) {
      return "snapshot.routineExercises apunta a un día fuera del snapshot";
    }
  }

  return null;
}

function validateWorkoutSessions(records: WorkoutSession[]): string | null {
  return firstError(records, "workoutSessions", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!sessionStatuses.has(String(record.status))) return "status no es válido";
    if (!sessionSources.has(String(record.source))) return "source no es válido";
    if (!isNullableString(record.routineId)) return "routineId debe ser string o null";
    if (!isNullableString(record.routineRevisionId)) return "routineRevisionId debe ser string o null";
    if (!isNullableString(record.routineNameSnapshot)) return "routineNameSnapshot inválido";
    if (!isNullableString(record.routineDayLabelSnapshot)) return "routineDayLabelSnapshot inválido";
    if (!isNonEmptyString(record.startedAt)) return "requiere startedAt";
    if (!isNullableString(record.endedAt)) return "endedAt debe ser string o null";
    if (!isFiniteNumber(record.durationSeconds) || record.durationSeconds < 0) {
      return "durationSeconds inválido";
    }
    if (!isFiniteNumber(record.pausedSeconds) || record.pausedSeconds < 0) {
      return "pausedSeconds inválido";
    }
    if (typeof record.notes !== "string") return "requiere notes";
    if (!isNonEmptyString(record.createdAt)) return "requiere createdAt";
    if (!isNonEmptyString(record.updatedAt)) return "requiere updatedAt";
    if (!isFiniteNumber(record.completedSetCount) || record.completedSetCount < 0) {
      return "completedSetCount inválido";
    }
    if (!isFiniteNumber(record.volumeKg) || record.volumeKg < 0) return "volumeKg inválido";
    if (!isFiniteNumber(record.prCount) || record.prCount < 0) return "prCount inválido";
    return null;
  });
}

function validateSetLogs(records: SetLog[]): string | null {
  return firstError(records, "setLogs", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (!isNonEmptyString(record.id)) return "requiere id";
    if (!isNonEmptyString(record.sessionId)) return "requiere sessionId";
    if (!isNonEmptyString(record.exerciseId)) return "requiere exerciseId";
    if (!isNullableString(record.routineExerciseId)) return "routineExerciseId inválido";
    if (!isNonEmptyString(record.exerciseNameSnapshot)) return "requiere exerciseNameSnapshot";
    if (record.guideSnapshot !== null && !isRecord(record.guideSnapshot)) return "guideSnapshot inválido";
    if (!isPositiveInteger(record.setIndex)) return "setIndex no es válido";
    if (record.weightKg !== null && (!isFiniteNumber(record.weightKg) || record.weightKg < 0)) {
      return "weightKg inválido";
    }
    if (record.reps !== null && (!isFiniteNumber(record.reps) || record.reps < 0)) {
      return "reps inválido";
    }
    if (record.rir !== null && !isFiniteNumber(record.rir)) return "rir inválido";
    if (typeof record.completed !== "boolean") return "requiere completed";
    if (!isNullableString(record.completedAt)) return "completedAt debe ser string o null";
    if (record.targetSnapshot !== null && !isTargetSnapshot(record.targetSnapshot)) {
      return "targetSnapshot inválido";
    }
    if (typeof record.notes !== "string") return "requiere notes";
    return null;
  });
}

function validateSettings(records: Settings[]): string | null {
  return firstError(records, "settings", (record) => {
    if (!isRecord(record)) return "no es un objeto";
    if (record.id !== "settings") return "id debe ser settings";
    if (!unitSystems.has(String(record.unitSystem))) return "unitSystem no es válido";
    if (!themes.has(String(record.theme))) return "theme no es válido";
    if (!isWeekday(record.firstDayOfWeek)) return "firstDayOfWeek no es válido";
    if (typeof record.showDeleteConfirmation !== "boolean") {
      return "showDeleteConfirmation inválido";
    }
    if (!isRecord(record.exportPreferences)) return "exportPreferences inválido";
    if (typeof record.exportPreferences.includeArchivedExercises !== "boolean") {
      return "includeArchivedExercises inválido";
    }
    if (typeof record.exportPreferences.includeDeletedRoutines !== "boolean") {
      return "includeDeletedRoutines inválido";
    }
    if (typeof record.exportPreferences.prettyPrint !== "boolean") {
      return "prettyPrint inválido";
    }
    if (!isNonEmptyString(record.createdAt)) return "requiere createdAt";
    if (!isNonEmptyString(record.updatedAt)) return "requiere updatedAt";
    return null;
  });
}

function validateReferences(data: DatabaseExportData): string | null {
  const routineIds = new Set(data.routines.map((record) => record.id));
  const routineDayIds = new Set(data.routineDays.map((record) => record.id));
  const routineExerciseIds = new Set(data.routineExercises.map((record) => record.id));
  const routineRevisionIds = new Set(data.routineRevisions.map((record) => record.id));
  const routineRevisionsById = new Map(
    data.routineRevisions.map((record) => [record.id, record]),
  );
  const exerciseIds = new Set(data.exercises.map((record) => record.id));
  const sessionIds = new Set(data.workoutSessions.map((record) => record.id));
  const sessionsById = new Map(data.workoutSessions.map((record) => [record.id, record]));

  for (const routineDay of data.routineDays) {
    if (!routineIds.has(routineDay.routineId)) {
      return `routineDays ${routineDay.id} apunta a rutina inexistente.`;
    }
  }

  for (const routineExercise of data.routineExercises) {
    if (!routineDayIds.has(routineExercise.routineDayId)) {
      return `routineExercises ${routineExercise.id} apunta a día inexistente.`;
    }
    if (!exerciseIds.has(routineExercise.exerciseId)) {
      return `routineExercises ${routineExercise.id} apunta a ejercicio inexistente.`;
    }
  }

  for (const revision of data.routineRevisions) {
    if (!routineIds.has(revision.routineId)) {
      return `routineRevisions ${revision.id} apunta a rutina inexistente.`;
    }
  }

  for (const session of data.workoutSessions) {
    if (session.routineId !== null && !routineIds.has(session.routineId)) {
      return `workoutSessions ${session.id} apunta a rutina inexistente.`;
    }
    if (
      session.routineRevisionId !== null &&
      !routineRevisionIds.has(session.routineRevisionId)
    ) {
      return `workoutSessions ${session.id} apunta a revisión inexistente.`;
    }
  }

  for (const setLog of data.setLogs) {
    if (!sessionIds.has(setLog.sessionId)) {
      return `setLogs ${setLog.id} apunta a sesión inexistente.`;
    }
    if (!exerciseIds.has(setLog.exerciseId)) {
      return `setLogs ${setLog.id} apunta a ejercicio inexistente.`;
    }
    if (
      setLog.routineExerciseId !== null &&
      !hasRoutineExerciseReference(
        setLog,
        routineExerciseIds,
        sessionsById,
        routineRevisionsById,
      )
    ) {
      return `setLogs ${setLog.id} apunta a ejercicio de rutina inexistente.`;
    }
  }

  return null;
}

function hasRoutineExerciseReference(
  setLog: SetLog,
  currentRoutineExerciseIds: Set<string>,
  sessionsById: Map<string, WorkoutSession>,
  routineRevisionsById: Map<string, RoutineRevision>,
): boolean {
  if (setLog.routineExerciseId === null) {
    return true;
  }

  if (currentRoutineExerciseIds.has(setLog.routineExerciseId)) {
    return true;
  }

  const session = sessionsById.get(setLog.sessionId);
  if (!session?.routineRevisionId) {
    return false;
  }

  const routineRevision = routineRevisionsById.get(session.routineRevisionId);
  return (
    routineRevision?.snapshot.routineExercises.some(
      (routineExercise) => routineExercise.id === setLog.routineExerciseId,
    ) ?? false
  );
}

function firstError<T>(
  records: T[],
  storeName: string,
  validateRecord: (record: T) => string | null,
): string | null {
  for (const [index, record] of records.entries()) {
    const error = validateRecord(record);
    if (error) {
      return `${storeName}[${index}] ${error}.`;
    }
  }

  return null;
}

function isGuide(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isStringArray(value.technique) &&
    isStringArray(value.setup) &&
    isStringArray(value.commonMistakes)
  );
}

function isTargetSnapshot(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.sortOrder) &&
    isPositiveInteger(value.targetSets) &&
    isPositiveInteger(value.targetRepsMin) &&
    isPositiveInteger(value.targetRepsMax) &&
    (value.targetRir === null || isFiniteNumber(value.targetRir)) &&
    isFiniteNumber(value.restSeconds) &&
    value.restSeconds >= 0
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isWeekday(value: unknown): value is 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(error: string): DataValidationResult {
  return { ok: false, error };
}
