import type { RoutineRevision, SetLog, WorkoutSession } from "../../domain";
import type { RoutineSummary } from "../routines/types";

export type WorkoutStartRequest = {
  id: number;
  summary: RoutineSummary;
};

export type WorkoutDraftState = {
  session: WorkoutSession;
  setLogs: SetLog[];
};

export type WorkoutCompletionSummary = {
  session: WorkoutSession;
  setLogs: SetLog[];
};

export type WorkoutBuildInput = {
  summary: RoutineSummary;
  routineRevision: RoutineRevision | undefined;
  startedAt?: string;
};
