import type { SetLog } from "./types";

type SetMetricsInput = Pick<SetLog, "completed" | "weightKg" | "reps">;

export type ExercisePr = {
  exerciseId: string;
  exerciseNameSnapshot: string;
  setLogId: string;
  completedAt: string;
  estimatedOneRepMax: number;
  weightKg: number;
  reps: number;
};

export type AdherenceResult = {
  planned: number;
  completed: number;
  percentage: number;
};

function isFiniteNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculateSetVolume(set: SetMetricsInput): number {
  if (!set.completed || !isFiniteNumber(set.weightKg) || !isFiniteNumber(set.reps)) {
    return 0;
  }

  if (set.weightKg < 0 || set.reps <= 0) {
    return 0;
  }

  return set.weightKg * set.reps;
}

export function calculateSessionVolume(sets: SetMetricsInput[]): number {
  return sets.reduce((total, set) => total + calculateSetVolume(set), 0);
}

export function calculateEstimatedOneRepMax(set: SetMetricsInput): number | null {
  if (!set.completed || !isFiniteNumber(set.weightKg) || !isFiniteNumber(set.reps)) {
    return null;
  }

  if (set.weightKg <= 0 || set.reps < 1 || set.reps > 12) {
    return null;
  }

  return set.weightKg * (1 + set.reps / 30);
}

export function calculatePrsByExercise(
  sets: Array<
    SetMetricsInput &
      Pick<SetLog, "id" | "exerciseId" | "exerciseNameSnapshot" | "completedAt">
  >,
): Record<string, ExercisePr> {
  return sets.reduce<Record<string, ExercisePr>>((prs, set) => {
    const estimatedOneRepMax = calculateEstimatedOneRepMax(set);
    if (
      estimatedOneRepMax === null ||
      set.completedAt === null ||
      !isFiniteNumber(set.weightKg) ||
      !isFiniteNumber(set.reps)
    ) {
      return prs;
    }

    const current = prs[set.exerciseId];
    const next: ExercisePr = {
      exerciseId: set.exerciseId,
      exerciseNameSnapshot: set.exerciseNameSnapshot,
      setLogId: set.id,
      completedAt: set.completedAt,
      estimatedOneRepMax,
      weightKg: set.weightKg,
      reps: set.reps,
    };

    if (!current) {
      prs[set.exerciseId] = next;
      return prs;
    }

    if (
      next.estimatedOneRepMax > current.estimatedOneRepMax ||
      (next.estimatedOneRepMax === current.estimatedOneRepMax &&
        next.completedAt > current.completedAt)
    ) {
      prs[set.exerciseId] = next;
    }

    return prs;
  }, {});
}

export function calculateAdherence(
  completedPlannedSessions: number,
  plannedSessions: number,
): AdherenceResult | null {
  if (
    !Number.isFinite(plannedSessions) ||
    !Number.isFinite(completedPlannedSessions) ||
    plannedSessions <= 0
  ) {
    return null;
  }

  const planned = Math.max(0, Math.floor(plannedSessions));
  if (planned === 0) {
    return null;
  }

  const completed = Math.max(0, Math.floor(completedPlannedSessions));
  const percentage = Math.min(100, Math.round((completed / planned) * 100));

  return {
    planned,
    completed,
    percentage,
  };
}
