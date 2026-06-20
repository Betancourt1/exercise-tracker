import type { SetLog, WorkoutSession } from "../domain/types";
import { calculateSessionVolume } from "../domain/analytics";
import { toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";

export type WorkoutDraft = {
  session: WorkoutSession;
  setLogs: SetLog[];
};

export type CompleteWorkoutSessionResult = WorkoutDraft & {
  completedSetCount: number;
  volumeKg: number;
};

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

export async function createWorkoutDraft(
  session: WorkoutSession,
  setLogs: SetLog[],
  db: WorkoutDatabase = appDb,
): Promise<WorkoutDraft> {
  return db.transaction("rw", db.workoutSessions, db.setLogs, async () => {
    await db.workoutSessions.put(session);
    if (setLogs.length > 0) {
      await db.setLogs.bulkPut(setLogs);
    }

    return {
      session,
      setLogs,
    };
  });
}

export async function getOrCreateWorkoutDraft(
  session: WorkoutSession,
  setLogs: SetLog[],
  db: WorkoutDatabase = appDb,
): Promise<WorkoutDraft> {
  return db.transaction("rw", db.workoutSessions, db.setLogs, async () => {
    const existingSessions = await db.workoutSessions
      .where("status")
      .equals("in_progress")
      .toArray();
    const existingSession = existingSessions.find((existingDraft) =>
      isSameWorkoutDraft(existingDraft, session),
    );

    if (existingSession) {
      return {
        session: existingSession,
        setLogs: await listSetLogsForSession(existingSession.id, db),
      };
    }

    await db.workoutSessions.put(session);
    if (setLogs.length > 0) {
      await db.setLogs.bulkPut(setLogs);
    }

    return {
      session,
      setLogs,
    };
  });
}

export async function getLatestInProgressWorkoutDraft(
  db: WorkoutDatabase = appDb,
): Promise<WorkoutDraft | null> {
  const sessions = await db.workoutSessions.where("status").equals("in_progress").toArray();
  const session = sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

  if (!session) {
    return null;
  }

  return {
    session,
    setLogs: await listSetLogsForSession(session.id, db),
  };
}

export async function saveWorkoutDraft(
  sessionId: string,
  setLogs: SetLog[],
  updatedAt = toIsoUtc(),
  db: WorkoutDatabase = appDb,
): Promise<WorkoutDraft | null> {
  return db.transaction("rw", db.workoutSessions, db.setLogs, async () => {
    const session = await db.workoutSessions.get(sessionId);
    if (!session || session.status !== "in_progress") {
      return null;
    }

    const updatedSession: WorkoutSession = {
      ...session,
      updatedAt,
    };
    await db.workoutSessions.put(updatedSession);
    await db.setLogs.where("sessionId").equals(sessionId).delete();
    if (setLogs.length > 0) {
      await db.setLogs.bulkPut(setLogs);
    }

    return {
      session: updatedSession,
      setLogs,
    };
  });
}

export async function completeWorkoutSession(
  sessionId: string,
  setLogs: SetLog[],
  completedAt = toIsoUtc(),
  db: WorkoutDatabase = appDb,
): Promise<CompleteWorkoutSessionResult | null> {
  return db.transaction("rw", db.workoutSessions, db.setLogs, async () => {
    const session = await db.workoutSessions.get(sessionId);
    if (!session || session.status !== "in_progress") {
      return null;
    }

    const completedSetLogs = setLogs.map((setLog) =>
      sanitizeCompletedSetLog(setLog, completedAt),
    );
    const completedSetCount = completedSetLogs.filter(isProgressSetLog).length;
    if (completedSetCount === 0) {
      return null;
    }

    const volumeKg = calculateSessionVolume(completedSetLogs);
    const endedAt = completedAt;
    const durationSeconds = calculateDurationSeconds(
      session.startedAt,
      endedAt,
      session.pausedSeconds,
    );
    const completedSession: WorkoutSession = {
      ...session,
      status: "completed",
      endedAt,
      durationSeconds,
      updatedAt: completedAt,
      completedSetCount,
      volumeKg,
      prCount: 0,
    };

    await db.workoutSessions.put(completedSession);
    await db.setLogs.where("sessionId").equals(sessionId).delete();
    if (completedSetLogs.length > 0) {
      await db.setLogs.bulkPut(completedSetLogs);
    }

    return {
      session: completedSession,
      setLogs: completedSetLogs,
      completedSetCount,
      volumeKg,
    };
  });
}

export async function discardWorkoutSession(
  sessionId: string,
  discardedAt = toIsoUtc(),
  db: WorkoutDatabase = appDb,
): Promise<WorkoutDraft | null> {
  return db.transaction("rw", db.workoutSessions, db.setLogs, async () => {
    const session = await db.workoutSessions.get(sessionId);
    if (!session || session.status !== "in_progress") {
      return null;
    }

    const draftSetLogs = await listSetLogsForSession(sessionId, db);
    const discardedSetLogs = draftSetLogs.map((setLog) => ({
      ...setLog,
      completed: false,
      completedAt: null,
    }));
    const discardedSession: WorkoutSession = {
      ...session,
      status: "discarded",
      endedAt: discardedAt,
      durationSeconds: calculateDurationSeconds(
        session.startedAt,
        discardedAt,
        session.pausedSeconds,
      ),
      updatedAt: discardedAt,
      completedSetCount: 0,
      volumeKg: 0,
      prCount: 0,
    };

    await db.workoutSessions.put(discardedSession);
    if (discardedSetLogs.length > 0) {
      await db.setLogs.bulkPut(discardedSetLogs);
    }

    return {
      session: discardedSession,
      setLogs: discardedSetLogs,
    };
  });
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
  const completedSetLogs = setLogs.filter((setLog) => setLog.completed);
  const sessionIds = [...new Set(completedSetLogs.map((setLog) => setLog.sessionId))];
  if (sessionIds.length === 0) {
    return [];
  }

  const sessions = await db.workoutSessions.bulkGet(sessionIds);
  const completedSessionIds = new Set(
    sessions
      .filter((session): session is WorkoutSession => session?.status === "completed")
      .map((session) => session.id),
  );

  return completedSetLogs
    .filter((setLog) => completedSessionIds.has(setLog.sessionId))
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

function sanitizeCompletedSetLog(setLog: SetLog, completedAt: string): SetLog {
  if (!isProgressSetLog(setLog)) {
    return {
      ...setLog,
      completed: false,
      completedAt: null,
    };
  }

  return {
    ...setLog,
    completed: true,
    completedAt: setLog.completedAt ?? completedAt,
  };
}

function isSameWorkoutDraft(currentSession: WorkoutSession, nextSession: WorkoutSession): boolean {
  return (
    currentSession.status === "in_progress" &&
    currentSession.source === "routine" &&
    currentSession.routineId === nextSession.routineId &&
    currentSession.routineRevisionId === nextSession.routineRevisionId &&
    currentSession.routineDayLabelSnapshot === nextSession.routineDayLabelSnapshot
  );
}

function isProgressSetLog(setLog: SetLog): boolean {
  return (
    setLog.completed &&
    typeof setLog.weightKg === "number" &&
    Number.isFinite(setLog.weightKg) &&
    setLog.weightKg >= 0 &&
    typeof setLog.reps === "number" &&
    Number.isFinite(setLog.reps) &&
    setLog.reps > 0
  );
}

function calculateDurationSeconds(
  startedAt: string,
  endedAt: string,
  pausedSeconds: number,
): number {
  const startedMs = Date.parse(startedAt);
  const endedMs = Date.parse(endedAt);
  if (!Number.isFinite(startedMs) || !Number.isFinite(endedMs) || endedMs <= startedMs) {
    return 0;
  }

  const elapsedSeconds = Math.floor((endedMs - startedMs) / 1000);
  return Math.max(0, elapsedSeconds - Math.max(0, Math.floor(pausedSeconds)));
}
