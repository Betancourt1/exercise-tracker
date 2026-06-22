import type {
  Exercise,
  ExerciseGuideSnapshot,
  RoutineExerciseTargetSnapshot,
  SetLog,
  WorkoutSession,
} from "./types";

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

export type ProgressSessionSummary = {
  sessionId: string;
  startedAt: string;
  routineName: string;
  routineDayLabel: string | null;
  durationSeconds: number;
  volumeKg: number;
  completedSetCount: number;
  exerciseCount: number;
  prCount: number;
};

export type ProgressVolumePoint = {
  sessionId: string;
  startedAt: string;
  label: string;
  volumeKg: number;
};

export type ProgressExerciseSet = {
  setLogId: string;
  sessionId: string;
  completedAt: string;
  weightKg: number;
  reps: number;
  rir: number | null;
  volumeKg: number;
  estimatedOneRepMax: number | null;
  isPr: boolean;
};

export type ProgressExerciseDetail = {
  exerciseId: string;
  exerciseName: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  completedSetCount: number;
  totalVolumeKg: number;
  bestEstimatedOneRepMax: number | null;
  bestWeightKg: number | null;
  bestWeightReps: number | null;
  bestSetAt: string | null;
  guideSnapshot: ExerciseGuideSnapshot | null;
  targetSnapshot: RoutineExerciseTargetSnapshot | null;
  recentSets: ProgressExerciseSet[];
};

export type ProgressMuscleLoad = {
  muscle: string;
  score: number;
  completedSetCount: number;
  primarySetCount: number;
  secondarySetCount: number;
  volumeKg: number;
};

export type ProgressAnalytics = {
  completedSessionCount: number;
  totalVolumeKg: number;
  completedSetCount: number;
  exercisePrCount: number;
  recentSessions: ProgressSessionSummary[];
  volumeTrend: ProgressVolumePoint[];
  exerciseDetails: ProgressExerciseDetail[];
  muscleLoads: ProgressMuscleLoad[];
};

export type ProgressAnalyticsInput = {
  sessions: WorkoutSession[];
  setLogs: SetLog[];
  exercises?: Exercise[];
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

export function buildProgressAnalytics({
  sessions,
  setLogs,
  exercises = [],
}: ProgressAnalyticsInput): ProgressAnalytics {
  const completedSessions = sessions
    .filter((session) => session.status === "completed")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const completedSessionById = new Map(
    completedSessions.map((session) => [session.id, session]),
  );
  const progressSetLogs = setLogs
    .filter((setLog) => isCompletedProgressSetLog(setLog, completedSessionById))
    .map((setLog) => ({
      setLog,
      completedAt:
        setLog.completedAt ??
        completedSessionById.get(setLog.sessionId)?.endedAt ??
        completedSessionById.get(setLog.sessionId)?.startedAt ??
        "",
    }))
    .filter((entry) => entry.completedAt.length > 0)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const progressSetLogsBySession = new Map<string, SetLog[]>();

  for (const { setLog } of progressSetLogs) {
    const sessionSetLogs = progressSetLogsBySession.get(setLog.sessionId) ?? [];
    sessionSetLogs.push(setLog);
    progressSetLogsBySession.set(setLog.sessionId, sessionSetLogs);
  }

  const prSourceSets = progressSetLogs.map(({ setLog, completedAt }) => ({
    ...setLog,
    completedAt,
  }));
  const prsByExercise = calculatePrsByExercise(prSourceSets);
  const prSetIds = new Set(Object.values(prsByExercise).map((pr) => pr.setLogId));
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  const recentSessions = completedSessions.map<ProgressSessionSummary>((session) => {
    const sessionSetLogs = progressSetLogsBySession.get(session.id) ?? [];
    const exerciseIds = new Set(sessionSetLogs.map((setLog) => setLog.exerciseId));
    const prCount = sessionSetLogs.filter((setLog) => prSetIds.has(setLog.id)).length;

    return {
      sessionId: session.id,
      startedAt: session.startedAt,
      routineName: session.routineNameSnapshot ?? "Sesión manual",
      routineDayLabel: session.routineDayLabelSnapshot,
      durationSeconds: session.durationSeconds,
      volumeKg: calculateSessionVolume(sessionSetLogs),
      completedSetCount: sessionSetLogs.length,
      exerciseCount: exerciseIds.size,
      prCount,
    };
  });

  const exerciseDetails = buildProgressExerciseDetails(
    progressSetLogs,
    prSetIds,
    exerciseById,
  );

  return {
    completedSessionCount: completedSessions.length,
    totalVolumeKg: progressSetLogs.reduce(
      (total, entry) => total + calculateSetVolume(entry.setLog),
      0,
    ),
    completedSetCount: progressSetLogs.length,
    exercisePrCount: Object.keys(prsByExercise).length,
    recentSessions: recentSessions.slice(0, 8),
    volumeTrend: recentSessions
      .slice(0, 8)
      .reverse()
      .map((session, index) => ({
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        label: `Sesión ${index + 1}`,
        volumeKg: session.volumeKg,
      })),
    exerciseDetails,
    muscleLoads: buildProgressMuscleLoads(progressSetLogs, exerciseById),
  };
}

function buildProgressExerciseDetails(
  progressSetLogs: Array<{ setLog: SetLog; completedAt: string }>,
  prSetIds: Set<string>,
  exerciseById: Map<string, Exercise>,
): ProgressExerciseDetail[] {
  const setsByExercise = new Map<string, Array<{ setLog: SetLog; completedAt: string }>>();

  for (const entry of progressSetLogs) {
    const exerciseSets = setsByExercise.get(entry.setLog.exerciseId) ?? [];
    exerciseSets.push(entry);
    setsByExercise.set(entry.setLog.exerciseId, exerciseSets);
  }

  return Array.from(setsByExercise.entries())
    .map(([exerciseId, exerciseSets]) => {
      const sortedSets = [...exerciseSets].sort((a, b) =>
        b.completedAt.localeCompare(a.completedAt),
      );
      const bestEstimatedOneRepMax = sortedSets.reduce<number | null>((best, entry) => {
        const estimatedOneRepMax = calculateEstimatedOneRepMax(entry.setLog);
        if (estimatedOneRepMax === null) {
          return best;
        }

        return best === null ? estimatedOneRepMax : Math.max(best, estimatedOneRepMax);
      }, null);
      const exercise = exerciseById.get(exerciseId);
      const isWeightRelevant = exercise?.weightRelevant !== false;

      const bestWeightSet = sortedSets.reduce<
        { weightKg: number | null; reps: number; completedAt: string } | null
      >((best, entry) => {
        const { weightKg, reps } = entry.setLog;

        if (!isWeightRelevant) {
          if (!isFiniteNumber(reps)) {
            return best;
          }
          if (
            !best ||
            reps > best.reps ||
            (reps === best.reps && entry.completedAt > best.completedAt)
          ) {
            return {
              weightKg: null,
              reps,
              completedAt: entry.completedAt,
            };
          }
          return best;
        }

        if (!isFiniteNumber(weightKg) || !isFiniteNumber(reps)) {
          return best;
        }

        if (
          !best ||
          best.weightKg === null ||
          weightKg > best.weightKg ||
          (weightKg === best.weightKg && reps > best.reps) ||
          (weightKg === best.weightKg &&
            reps === best.reps &&
            entry.completedAt > best.completedAt)
        ) {
          return {
            weightKg,
            reps,
            completedAt: entry.completedAt,
          };
        }

        return best;
      }, null);
      const recentSets = sortedSets.slice(0, 8).map<ProgressExerciseSet>((entry) => {
        const { setLog } = entry;

        return {
          setLogId: setLog.id,
          sessionId: setLog.sessionId,
          completedAt: entry.completedAt,
          weightKg: setLog.weightKg ?? 0,
          reps: setLog.reps ?? 0,
          rir: setLog.rir,
          volumeKg: calculateSetVolume(setLog),
          estimatedOneRepMax: calculateEstimatedOneRepMax(setLog),
          isPr: prSetIds.has(setLog.id),
        };
      });
      const guideSnapshot =
        sortedSets.find((entry) => entry.setLog.guideSnapshot)?.setLog.guideSnapshot ??
        null;
      const muscleSource = getExerciseMuscleSource(
        exerciseId,
        guideSnapshot,
        exerciseById,
      );

      return {
        exerciseId,
        exerciseName: sortedSets[0]?.setLog.exerciseNameSnapshot ?? "Ejercicio",
        primaryMuscles: muscleSource.primaryMuscles,
        secondaryMuscles: muscleSource.secondaryMuscles,
        completedSetCount: exerciseSets.length,
        totalVolumeKg: exerciseSets.reduce(
          (total, entry) => total + calculateSetVolume(entry.setLog),
          0,
        ),
        bestEstimatedOneRepMax,
        bestWeightKg: bestWeightSet?.weightKg ?? null,
        bestWeightReps: bestWeightSet?.reps ?? null,
        bestSetAt: bestWeightSet?.completedAt ?? null,
        guideSnapshot,
        targetSnapshot:
          sortedSets.find((entry) => entry.setLog.targetSnapshot)?.setLog.targetSnapshot ?? null,
        recentSets,
      };
    })
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "es-MX"));
}

function buildProgressMuscleLoads(
  progressSetLogs: Array<{ setLog: SetLog; completedAt: string }>,
  exerciseById: Map<string, Exercise>,
): ProgressMuscleLoad[] {
  const loads = new Map<string, ProgressMuscleLoad>();

  for (const { setLog } of progressSetLogs) {
    const source = getSetMuscleSource(setLog, exerciseById);
    const primaryKeys = new Set(source.primaryMuscles.map(normalizeMuscleName));
    const touchedKeys = new Set<string>();

    for (const muscle of source.primaryMuscles) {
      addMuscleLoad(loads, muscle, setLog, 1, "primary");
      touchedKeys.add(normalizeMuscleName(muscle));
    }

    for (const muscle of source.secondaryMuscles) {
      const muscleKey = normalizeMuscleName(muscle);
      if (primaryKeys.has(muscleKey)) {
        continue;
      }

      addMuscleLoad(loads, muscle, setLog, 0.5, "secondary");
      touchedKeys.add(muscleKey);
    }

    for (const muscleKey of touchedKeys) {
      const load = loads.get(muscleKey);
      if (load) {
        load.completedSetCount += 1;
      }
    }
  }

  return Array.from(loads.values()).sort(
    (a, b) => b.score - a.score || a.muscle.localeCompare(b.muscle, "es-MX"),
  );
}

function addMuscleLoad(
  loads: Map<string, ProgressMuscleLoad>,
  muscle: string,
  setLog: SetLog,
  weight: number,
  role: "primary" | "secondary",
) {
  const muscleKey = normalizeMuscleName(muscle);
  if (muscleKey.length === 0) {
    return;
  }

  const current =
    loads.get(muscleKey) ??
    ({
      muscle,
      score: 0,
      completedSetCount: 0,
      primarySetCount: 0,
      secondarySetCount: 0,
      volumeKg: 0,
    } satisfies ProgressMuscleLoad);

  current.score += weight;
  current.volumeKg += calculateSetVolume(setLog) * weight;
  if (role === "primary") {
    current.primarySetCount += 1;
  } else {
    current.secondarySetCount += 1;
  }

  loads.set(muscleKey, current);
}

function getSetMuscleSource(
  setLog: SetLog,
  exerciseById: Map<string, Exercise>,
): Pick<Exercise, "primaryMuscles" | "secondaryMuscles"> {
  return getExerciseMuscleSource(setLog.exerciseId, setLog.guideSnapshot, exerciseById);
}

function getExerciseMuscleSource(
  exerciseId: string,
  guideSnapshot: ExerciseGuideSnapshot | null,
  exerciseById: Map<string, Exercise>,
): Pick<Exercise, "primaryMuscles" | "secondaryMuscles"> {
  const snapshotPrimary = readStringArray(guideSnapshot?.primaryMuscles);
  const snapshotSecondary = readStringArray(guideSnapshot?.secondaryMuscles);
  if (snapshotPrimary.length > 0 || snapshotSecondary.length > 0) {
    return {
      primaryMuscles: snapshotPrimary,
      secondaryMuscles: snapshotSecondary,
    };
  }

  const exercise = exerciseById.get(exerciseId);
  return {
    primaryMuscles: exercise?.primaryMuscles ?? [],
    secondaryMuscles: exercise?.secondaryMuscles ?? [],
  };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeMuscleName(value: string): string {
  return value.trim().toLocaleLowerCase("es-MX");
}

function isCompletedProgressSetLog(
  setLog: SetLog,
  completedSessionById: Map<string, WorkoutSession>,
): boolean {
  if (!setLog.completed || !completedSessionById.has(setLog.sessionId)) {
    return false;
  }

  return (
    isFiniteNumber(setLog.weightKg) &&
    setLog.weightKg >= 0 &&
    isFiniteNumber(setLog.reps) &&
    setLog.reps > 0
  );
}
