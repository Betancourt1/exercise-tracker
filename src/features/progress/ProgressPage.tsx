import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarDays,
  Dumbbell,
  Medal,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type {
  ExerciseGuideSnapshot,
  ProgressAnalytics,
  ProgressExerciseDetail,
  ProgressExerciseSet,
  ProgressSessionSummary,
  ProgressVolumePoint,
  RoutineExerciseTargetSnapshot,
} from "../../domain";
import { loadProgressAnalytics } from "./progressQueries";

type ProgressPageProps = {
  onTrain: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const compactDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
});
const integerFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

export function ProgressPage({ onTrain }: ProgressPageProps) {
  const [analytics, setAnalytics] = useState<ProgressAnalytics | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadInitialProgress() {
      try {
        const nextAnalytics = await loadProgressAnalytics();
        if (isCurrent) {
          setAnalytics(nextAnalytics);
          setError(null);
        }
      } catch {
        if (isCurrent) {
          setError("No se pudieron cargar las analíticas locales.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialProgress();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!analytics) {
      return;
    }

    setSelectedExerciseId((currentExerciseId) => {
      if (
        currentExerciseId &&
        analytics.exerciseDetails.some(
          (exercise) => exercise.exerciseId === currentExerciseId,
        )
      ) {
        return currentExerciseId;
      }

      return analytics.exerciseDetails[0]?.exerciseId ?? null;
    });
  }, [analytics]);

  const selectedExercise = useMemo(
    () =>
      analytics?.exerciseDetails.find(
        (exercise) => exercise.exerciseId === selectedExerciseId,
      ) ??
      analytics?.exerciseDetails[0] ??
      null,
    [analytics?.exerciseDetails, selectedExerciseId],
  );

  async function refreshProgress() {
    setIsLoading(true);
    try {
      setAnalytics(await loadProgressAnalytics());
      setError(null);
    } catch {
      setError("No se pudieron cargar las analíticas locales.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading && !analytics) {
    return (
      <section className="page-section progress-page">
        <ProgressHeader onRefresh={refreshProgress} isRefreshing={isLoading} />
        <article className="panel">
          <div className="empty-state">
            <strong>Cargando progreso</strong>
            <p>Revisando sesiones terminadas y series guardadas localmente.</p>
          </div>
        </article>
      </section>
    );
  }

  if (error && !analytics) {
    return (
      <section className="page-section progress-page">
        <ProgressHeader onRefresh={refreshProgress} isRefreshing={isLoading} />
        <article className="panel progress-empty-panel">
          <AlertCircle size={24} />
          <strong>No se pudo cargar Progreso</strong>
          <p>{error}</p>
          <button className="secondary-button" type="button" onClick={refreshProgress}>
            <RotateCcw size={16} />
            Reintentar
          </button>
        </article>
      </section>
    );
  }

  if (!analytics || analytics.completedSessionCount === 0) {
    return (
      <section className="page-section progress-page">
        <ProgressHeader onRefresh={refreshProgress} isRefreshing={isLoading} />
        <article className="panel progress-empty-panel">
          <BarChart3 size={24} />
          <strong>Aún no hay progreso para mostrar</strong>
          <p>
            Termina una sesión de entrenamiento para alimentar volumen, series, PRs y
            detalle por ejercicio. Los borradores y sesiones descartadas no se cuentan.
          </p>
          <button className="primary-button training" type="button" onClick={onTrain}>
            <Play size={16} />
            Ir a entrenar
          </button>
        </article>
        <FormulaHelp />
      </section>
    );
  }

  return (
    <section className="page-section progress-page">
      <ProgressHeader onRefresh={refreshProgress} isRefreshing={isLoading} />
      {error ? <p className="form-error">{error}</p> : null}

      <div className="metric-grid progress-metric-grid">
        <ProgressMetricCard
          label="Sesiones terminadas"
          value={integerFormatter.format(analytics.completedSessionCount)}
          tone="training"
        />
        <ProgressMetricCard
          label="Volumen total"
          value={`${formatKg(analytics.totalVolumeKg)} kg`}
          tone="progress"
        />
        <ProgressMetricCard
          label="Series completadas"
          value={integerFormatter.format(analytics.completedSetCount)}
          tone="routine"
        />
        <ProgressMetricCard
          label="Ejercicios con PR"
          value={integerFormatter.format(analytics.exercisePrCount)}
          tone="progress"
        />
      </div>

      <article className="panel progress-help-strip">
        <strong>Adherencia pendiente</strong>
        <span>
          Aún no se muestra porcentaje de adherencia porque falta una agenda planificada
          confiable. Esta vista solo cuenta sesiones terminadas.
        </span>
      </article>

      <div className="progress-main-grid">
        <div className="progress-main-column">
          <VolumeTrendChart points={analytics.volumeTrend} />
          <RecentSessionsList sessions={analytics.recentSessions} />
        </div>

        <aside className="progress-side-column">
          <ExerciseSelector
            exercises={analytics.exerciseDetails}
            selectedExerciseId={selectedExercise?.exerciseId ?? null}
            onSelectExercise={setSelectedExerciseId}
          />
          {selectedExercise ? (
            <>
              <ExerciseDetailPanel exercise={selectedExercise} />
              <ExerciseGuidePanel
                guideSnapshot={selectedExercise.guideSnapshot}
                targetSnapshot={selectedExercise.targetSnapshot}
              />
            </>
          ) : (
            <article className="panel">
              <div className="empty-state">
                <strong>Sin detalle por ejercicio</strong>
                <p>Guarda series completadas para ver mejores pesos y 1RM estimado.</p>
              </div>
            </article>
          )}
        </aside>
      </div>

      <FormulaHelp />
    </section>
  );
}

function ProgressHeader({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <header className="page-title">
      <div>
        <p>Progreso</p>
        <h1 id="page-title">Analíticas</h1>
      </div>
      <button
        className="secondary-button"
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RotateCcw size={16} />
        Actualizar
      </button>
    </header>
  );
}

function ProgressMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "routine" | "training" | "progress";
}) {
  return (
    <article className="metric-card" data-tone={tone}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function VolumeTrendChart({ points }: { points: ProgressVolumePoint[] }) {
  const maxVolume = Math.max(...points.map((point) => point.volumeKg), 1);

  return (
    <article className="panel progress-chart-panel">
      <div className="panel-header">
        <div>
          <p className="panel-label">Tendencia</p>
          <h2>Volumen por sesión</h2>
        </div>
        <BarChart3 size={19} className="progress-panel-icon" />
      </div>

      <div
        className="progress-volume-chart"
        role="img"
        aria-label="Volumen de las últimas sesiones terminadas"
      >
        {points.map((point) => (
          <div className="progress-volume-point" key={point.sessionId}>
            <strong>{formatKg(point.volumeKg)}</strong>
            <span
              style={{
                height: `${Math.max(12, (point.volumeKg / maxVolume) * 100)}%`,
              }}
            />
            <small>{formatCompactDate(point.startedAt)}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function RecentSessionsList({ sessions }: { sessions: ProgressSessionSummary[] }) {
  return (
    <article className="panel progress-sessions-panel">
      <div className="panel-header">
        <div>
          <p className="panel-label">Historial</p>
          <h2>Sesiones recientes</h2>
        </div>
        <CalendarDays size={19} className="progress-panel-icon" />
      </div>

      <div className="progress-session-list">
        <div className="progress-session-head" aria-hidden="true">
          <span>Fecha</span>
          <span>Rutina</span>
          <span>Duración</span>
          <span>Volumen</span>
          <span>Series</span>
          <span>PRs</span>
        </div>
        {sessions.map((session) => (
          <div className="progress-session-row" key={session.sessionId}>
            <span>{formatDate(session.startedAt)}</span>
            <strong>{formatRoutineName(session)}</strong>
            <span>{formatDuration(session.durationSeconds)}</span>
            <span>{formatKg(session.volumeKg)} kg</span>
            <span>{session.completedSetCount}</span>
            <span>{session.prCount > 0 ? session.prCount : "-"}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function ExerciseSelector({
  exercises,
  selectedExerciseId,
  onSelectExercise,
}: {
  exercises: ProgressExerciseDetail[];
  selectedExerciseId: string | null;
  onSelectExercise: (exerciseId: string) => void;
}) {
  return (
    <article className="panel progress-exercise-selector">
      <div className="panel-header">
        <div>
          <p className="panel-label">Ejercicios</p>
          <h2>Detalle</h2>
        </div>
        <Dumbbell size={19} className="progress-panel-icon" />
      </div>

      <div className="progress-exercise-list">
        {exercises.map((exercise) => (
          <button
            key={exercise.exerciseId}
            type="button"
            data-active={exercise.exerciseId === selectedExerciseId}
            onClick={() => onSelectExercise(exercise.exerciseId)}
          >
            <strong>{exercise.exerciseName}</strong>
            <span>
              {exercise.bestEstimatedOneRepMax === null
                ? "Sin 1RM estimado"
                : `${formatDecimalKg(exercise.bestEstimatedOneRepMax)} kg e1RM`}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

function ExerciseDetailPanel({ exercise }: { exercise: ProgressExerciseDetail }) {
  const chronologicalSets = [...exercise.recentSets].reverse();
  const maxEstimatedOneRepMax = Math.max(
    ...chronologicalSets.map((set) => set.estimatedOneRepMax ?? 0),
    1,
  );

  return (
    <article className="panel progress-exercise-detail">
      <div className="panel-header">
        <div>
          <p className="panel-label">Movimiento</p>
          <h2>{exercise.exerciseName}</h2>
        </div>
        <Trophy size={19} className="progress-panel-icon" />
      </div>

      <div className="progress-mini-metrics">
        <div>
          <span>Mejor 1RM estimado</span>
          <strong>
            {exercise.bestEstimatedOneRepMax === null
              ? "-"
              : `${formatDecimalKg(exercise.bestEstimatedOneRepMax)} kg`}
          </strong>
        </div>
        <div>
          <span>Mejor peso</span>
          <strong>
            {exercise.bestWeightKg === null
              ? "-"
              : `${formatDecimalKg(exercise.bestWeightKg)} kg x ${
                  exercise.bestWeightReps ?? "-"
                }`}
          </strong>
        </div>
        <div>
          <span>Volumen</span>
          <strong>{formatKg(exercise.totalVolumeKg)} kg</strong>
        </div>
      </div>

      <div
        className="progress-estimate-chart"
        role="img"
        aria-label={`1RM estimado reciente para ${exercise.exerciseName}`}
      >
        {chronologicalSets.map((set) => (
          <div className="progress-estimate-point" key={set.setLogId}>
            <span
              style={{
                height: `${Math.max(
                  10,
                  ((set.estimatedOneRepMax ?? 0) / maxEstimatedOneRepMax) * 100,
                )}%`,
              }}
            />
            <small>{formatCompactDate(set.completedAt)}</small>
          </div>
        ))}
      </div>

      <SetHistory sets={exercise.recentSets} />
    </article>
  );
}

function SetHistory({ sets }: { sets: ProgressExerciseSet[] }) {
  return (
    <div className="progress-set-history">
      <strong>Series recientes</strong>
      {sets.map((set) => (
        <div className="progress-set-row" key={set.setLogId}>
          <span>{formatCompactDate(set.completedAt)}</span>
          <strong>
            {formatDecimalKg(set.weightKg)} kg x {set.reps}
          </strong>
          <span>{set.rir === null ? "RIR -" : `RIR ${set.rir}`}</span>
          <span>{set.isPr ? "PR" : `${formatKg(set.volumeKg)} kg`}</span>
        </div>
      ))}
    </div>
  );
}

function ExerciseGuidePanel({
  guideSnapshot,
  targetSnapshot,
}: {
  guideSnapshot: ExerciseGuideSnapshot | null;
  targetSnapshot: RoutineExerciseTargetSnapshot | null;
}) {
  return (
    <article className="panel progress-guide-panel">
      <div className="panel-header">
        <div>
          <p className="panel-label">Guía</p>
          <h2>Técnica y objetivo</h2>
        </div>
        <BookOpen size={19} className="progress-panel-icon" />
      </div>

      {guideSnapshot ? (
        <div className="progress-guide-content">
          {guideSnapshot.equipmentDetail ? (
            <GuideBlock title="Estación" items={[guideSnapshot.equipmentDetail]} />
          ) : null}
          <GuideBlock title="Técnica" items={guideSnapshot.guide.technique} />
          <GuideBlock title="Evita" items={guideSnapshot.guide.commonMistakes} />
        </div>
      ) : (
        <p className="muted">
          No hay guía guardada para este ejercicio en las sesiones recientes.
        </p>
      )}

      {targetSnapshot ? (
        <div className="progress-target-note">
          <Medal size={16} />
          <span>
            Objetivo guardado: {targetSnapshot.targetSets} series,{" "}
            {targetSnapshot.targetRepsMin}-{targetSnapshot.targetRepsMax} reps
            {targetSnapshot.targetRir === null ? "" : `, RIR ${targetSnapshot.targetRir}`} ·{" "}
            descanso {formatDuration(targetSnapshot.restSeconds)}
          </span>
        </div>
      ) : null}
    </article>
  );
}

function GuideBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="progress-guide-block">
      <strong>{title}</strong>
      <ul>
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function FormulaHelp() {
  return (
    <article className="panel progress-formula-help">
      <strong>Cómo se calcula</strong>
      <span>
        Volumen = kg x repeticiones de series completadas. 1RM estimado usa Epley:
        peso x (1 + reps / 30), solo como referencia de entrenamiento.
      </span>
    </article>
  );
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatCompactDate(value: string): string {
  return compactDateFormatter.format(new Date(value));
}

function formatKg(value: number): string {
  return integerFormatter.format(Math.round(value));
}

function formatDecimalKg(value: number): string {
  return decimalFormatter.format(value);
}

function formatDuration(durationSeconds: number): string {
  const safeDuration = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(safeDuration / 3600);
  const minutes = Math.floor((safeDuration % 3600) / 60);
  const seconds = safeDuration % 60;
  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (minutes > 0 && seconds > 0) {
    return `${minutes} min ${seconds}s`;
  }

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes} min`;
}

function formatRoutineName(session: ProgressSessionSummary): string {
  return session.routineDayLabel
    ? `${session.routineName} · ${session.routineDayLabel}`
    : session.routineName;
}
