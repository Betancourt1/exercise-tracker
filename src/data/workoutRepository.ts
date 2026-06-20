import type { SetLog, WorkoutSession } from "../domain/types";
import { appDb, type WorkoutDatabase } from "./db";

export async function getWorkoutSession(
  id: string,
  db: WorkoutDatabase = appDb,
): Promise<WorkoutSession | undefined> {
  return db.workoutSessions.get(id);
}

export async function saveWorkoutSession(
  session: WorkoutSession,
  db: WorkoutDatabase = appDb,
): Promise<string> {
  return db.workoutSessions.put(session);
}

export async function listWorkoutSessions(
  options: { limit?: number } = {},
  db: WorkoutDatabase = appDb,
): Promise<WorkoutSession[]> {
  let sessions = await db.workoutSessions.orderBy("startedAt").reverse().toArray();
  if (options.limit !== undefined) {
    sessions = sessions.slice(0, options.limit);
  }

  return sessions;
}

export async function listCompletedWorkoutSessions(
  db: WorkoutDatabase = appDb,
): Promise<WorkoutSession[]> {
  const sessions = await db.workoutSessions.where("status").equals("completed").toArray();
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function saveSetLog(
  setLog: SetLog,
  db: WorkoutDatabase = appDb,
): Promise<string> {
  return db.setLogs.put(setLog);
}

export async function saveSetLogs(
  setLogs: SetLog[],
  db: WorkoutDatabase = appDb,
): Promise<number> {
  await db.setLogs.bulkPut(setLogs);
  return setLogs.length;
}

export async function listSetLogsForSession(
  sessionId: string,
  db: WorkoutDatabase = appDb,
): Promise<SetLog[]> {
  const setLogs = await db.setLogs.where("sessionId").equals(sessionId).toArray();
  return setLogs.sort((a, b) => a.setIndex - b.setIndex);
}

export async function listCompletedSetLogsForExercise(
  exerciseId: string,
  db: WorkoutDatabase = appDb,
): Promise<SetLog[]> {
  const setLogs = await db.setLogs.where("exerciseId").equals(exerciseId).toArray();

  return setLogs
    .filter((setLog) => setLog.completed)
    .sort((a, b) => String(a.completedAt).localeCompare(String(b.completedAt)));
}

export async function deleteWorkoutSession(
  id: string,
  db: WorkoutDatabase = appDb,
): Promise<void> {
  await db.transaction("rw", db.workoutSessions, db.setLogs, async () => {
    await db.setLogs.where("sessionId").equals(id).delete();
    await db.workoutSessions.delete(id);
  });
}
