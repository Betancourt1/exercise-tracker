import type {
  Exercise,
  ExerciseGuideSnapshot,
  RoutineDay,
  RoutineExercise,
  RoutineExerciseTargetSnapshot,
  RoutineRevision,
  SetLog,
  WorkoutSession,
} from "../../domain";
import { createId, toIsoUtc } from "../../domain";
import type { RoutineSummary } from "../routines/types";

export type WorkoutExerciseGroup = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  routineExerciseId: string | null;
  targetSnapshot: RoutineExerciseTargetSnapshot | null;
  guideSnapshot: ExerciseGuideSnapshot | null;
  setLogs: SetLog[];
};

export function selectWorkoutDay(summary: RoutineSummary): RoutineDay | null {
  return (
    summary.days.find((day) =>
      summary.routineExercises.some(
        (routineExercise) => routineExercise.routineDayId === day.id,
      ),
    ) ??
    summary.days[0] ??
    null
  );
}

export function buildWorkoutDraftFromRoutine(
  summary: RoutineSummary,
  routineRevision: RoutineRevision | undefined,
  exercises: Exercise[],
  startedAt = toIsoUtc(),
): { session: WorkoutSession; setLogs: SetLog[]; selectedDay: RoutineDay | null } {
  const selectedDay = selectWorkoutDay(summary);
  const sessionId = createId();
  const session: WorkoutSession = {
    id: sessionId,
    status: "in_progress",
    source: "routine",
    routineId: summary.routine.id,
    routineRevisionId: routineRevision?.id ?? null,
    routineNameSnapshot: summary.routine.name,
    routineDayLabelSnapshot: selectedDay?.label ?? null,
    startedAt,
    endedAt: null,
    durationSeconds: 0,
    pausedSeconds: 0,
    notes: "",
    createdAt: startedAt,
    updatedAt: startedAt,
    completedSetCount: 0,
    volumeKg: 0,
    prCount: 0,
  };

  if (!selectedDay) {
    return { session, setLogs: [], selectedDay };
  }

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  let setIndex = 1;
  const setLogs = summary.routineExercises
    .filter((routineExercise) => routineExercise.routineDayId === selectedDay.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((routineExercise) => {
      const exercise = exerciseById.get(routineExercise.exerciseId);
      const targetSets = Math.max(1, Math.floor(routineExercise.targetSets));

      return Array.from({ length: targetSets }).map(() => {
        const setLog: SetLog = {
          id: createId(),
          sessionId,
          exerciseId: routineExercise.exerciseId,
          routineExerciseId: routineExercise.id,
          exerciseNameSnapshot: exercise?.name ?? "Ejercicio guardado",
          guideSnapshot: exercise ? createGuideSnapshot(exercise) : null,
          setIndex,
          weightKg: routineExercise.targetWeightKg ?? null,
          reps: routineExercise.targetRepsMin,
          rir: routineExercise.targetRir,
          completed: false,
          completedAt: null,
          targetSnapshot: createTargetSnapshot(routineExercise),
          notes: "",
        };
        setIndex += 1;
        return setLog;
      });
    });

  return { session, setLogs, selectedDay };
}

export function groupWorkoutSetLogs(setLogs: SetLog[]): WorkoutExerciseGroup[] {
  const groups = new Map<string, WorkoutExerciseGroup>();

  for (const setLog of [...setLogs].sort((a, b) => a.setIndex - b.setIndex)) {
    const key = setLog.routineExerciseId ?? `${setLog.exerciseId}:${setLog.exerciseNameSnapshot}`;
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.setLogs.push(setLog);
      continue;
    }

    groups.set(key, {
      key,
      exerciseId: setLog.exerciseId,
      exerciseName: setLog.exerciseNameSnapshot,
      routineExerciseId: setLog.routineExerciseId,
      targetSnapshot: setLog.targetSnapshot,
      guideSnapshot: setLog.guideSnapshot,
      setLogs: [setLog],
    });
  }

  return Array.from(groups.values());
}

export function formatWorkoutDuration(durationSeconds: number): string {
  const safeDuration = Math.max(0, Math.floor(durationSeconds));
  const minutes = Math.floor(safeDuration / 60);
  const seconds = safeDuration % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function createTargetSnapshot(
  routineExercise: RoutineExercise,
): RoutineExerciseTargetSnapshot {
  return {
    sortOrder: routineExercise.sortOrder,
    targetSets: routineExercise.targetSets,
    targetRepsMin: routineExercise.targetRepsMin,
    targetRepsMax: routineExercise.targetRepsMax,
    targetRir: routineExercise.targetRir,
    restSeconds: routineExercise.restSeconds,
    targetWeightKg: routineExercise.targetWeightKg ?? null,
  };
}

function createGuideSnapshot(exercise: Exercise): ExerciseGuideSnapshot {
  return {
    id: exercise.id,
    name: exercise.name,
    equipmentDetail: exercise.equipmentDetail,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    guide: exercise.guide,
    type: exercise.type,
    weightRelevant: exercise.weightRelevant,
    media: exercise.media,
  };
}
