import {
  listCompletedProgressSetLogs,
  listCompletedWorkoutSessions,
  listSeededAvailableExercises,
} from "../../data";
import { buildProgressAnalytics, type ProgressAnalytics } from "../../domain";

export async function loadProgressAnalytics(): Promise<ProgressAnalytics> {
  const [sessions, setLogs, exercises] = await Promise.all([
    listCompletedWorkoutSessions(),
    listCompletedProgressSetLogs(),
    listSeededAvailableExercises(),
  ]);

  return buildProgressAnalytics({ sessions, setLogs, exercises });
}
