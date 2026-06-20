import Dexie, { type Table } from "dexie";
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

export const DB_NAME = "rutina-ejercicio";
export const DB_SCHEMA_VERSION = 1;

export class WorkoutDatabase extends Dexie {
  meta!: Table<AppMetaRecord, string>;
  exercises!: Table<Exercise, string>;
  routines!: Table<Routine, string>;
  routineDays!: Table<RoutineDay, string>;
  routineExercises!: Table<RoutineExercise, string>;
  routineRevisions!: Table<RoutineRevision, string>;
  workoutSessions!: Table<WorkoutSession, string>;
  setLogs!: Table<SetLog, string>;
  settings!: Table<Settings, string>;

  constructor(name = DB_NAME) {
    super(name);

    this.version(DB_SCHEMA_VERSION).stores({
      meta: "&id",
      exercises:
        "&id, &nameNormalized, *primaryMuscles, *equipment, *tags, isCustom, archivedAt, updatedAt",
      routines: "&id, status, manualOrder, deletedAt, updatedAt",
      routineDays: "&id, routineId, [routineId+sortOrder], weekday, isActive",
      routineExercises: "&id, routineDayId, exerciseId, [routineDayId+sortOrder]",
      routineRevisions:
        "&id, routineId, [routineId+revisionNumber], effectiveFrom, effectiveTo",
      workoutSessions:
        "&id, status, source, routineId, routineRevisionId, startedAt, endedAt, updatedAt",
      setLogs:
        "&id, sessionId, exerciseId, routineExerciseId, completed, completedAt, [sessionId+setIndex], [exerciseId+completedAt]",
      settings: "&id",
    });
  }
}

export const appDb = new WorkoutDatabase();
