import { listCompletedProgressSetLogs, listCompletedWorkoutSessions } from "../../data";
import { buildProgressAnalytics, type ProgressAnalytics } from "../../domain";

export async function loadProgressAnalytics(): Promise<ProgressAnalytics> {
  const [sessions, setLogs] = await Promise.all([
    listCompletedWorkoutSessions(),
    listCompletedProgressSetLogs(),
  ]);

  return buildProgressAnalytics({ sessions, setLogs });
}
