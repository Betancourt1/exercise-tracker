import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Dumbbell,
  RotateCcw,
  Save,
  Timer,
  X,
} from "lucide-react";
import {
  completeWorkoutSession,
  discardWorkoutSession,
  getActiveRoutineRevision,
  getLatestInProgressWorkoutDraft,
  getOrCreateWorkoutDraft,
  listExercises,
  saveWorkoutDraft,
} from "../../data";
import type { SetLog } from "../../domain";
import {
  buildWorkoutDraftFromRoutine,
  formatWorkoutDuration,
  groupWorkoutSetLogs,
} from "./workoutBuilders";
import type {
  WorkoutCompletionSummary,
  WorkoutDraftState,
  WorkoutStartRequest,
} from "./types";

type WorkoutPageProps = {
  startRequest: WorkoutStartRequest | null;
  onExit: (page: "today" | "routines") => void;
  onWorkoutChanged?: () => void;
};

type EmptyWorkoutReason = "idle" | "no-exercises" | "load-error";

export function WorkoutPage({
  startRequest,
  onExit,
  onWorkoutChanged,
}: WorkoutPageProps) {
  const [draft, setDraft] = useState<WorkoutDraftState | null>(null);
  const [completionSummary, setCompletionSummary] =
    useState<WorkoutCompletionSummary | null>(null);
  const [emptyReason, setEmptyReason] = useState<EmptyWorkoutReason>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const exerciseGroups = useMemo(
    () => groupWorkoutSetLogs(draft?.setLogs ?? []),
    [draft?.setLogs],
  );
  const currentGroup = exerciseGroups[currentGroupIndex] ?? exerciseGroups[0] ?? null;
  const completedSetCount = draft?.setLogs.filter((setLog) => setLog.completed).length ?? 0;
  const hasValidCompletedSeries = draft?.setLogs.some(isValidCompletedSeries) ?? false;
  const currentRestTarget = currentGroup?.targetSnapshot?.restSeconds ?? 60;

  useEffect(() => {
    let isCurrent = true;

    async function loadInitialDraft() {
      if (startRequest) {
        return;
      }

      setIsLoading(true);
      try {
        const restoredDraft = await getLatestInProgressWorkoutDraft();
        if (!isCurrent) {
          return;
        }

        setDraft(restoredDraft);
        setEmptyReason(restoredDraft ? "idle" : "idle");
      } catch {
        if (isCurrent) {
          setEmptyReason("load-error");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialDraft();

    return () => {
      isCurrent = false;
    };
  }, [startRequest]);

  useEffect(() => {
    let isCurrent = true;

    async function startWorkout() {
      if (!startRequest) {
        return;
      }

      setIsLoading(true);
      setCompletionSummary(null);
      setShowDiscardConfirm(false);

      try {
        const existingDraft = await getLatestInProgressWorkoutDraft();
        if (existingDraft) {
          if (isCurrent) {
            setDraft(existingDraft);
            setCurrentGroupIndex(0);
            setEmptyReason("idle");
            onWorkoutChanged?.();
          }
          return;
        }

        const [routineRevision, exercises] = await Promise.all([
          getActiveRoutineRevision(startRequest.summary.routine.id),
          listExercises(),
        ]);
        const nextDraft = buildWorkoutDraftFromRoutine(
          startRequest.summary,
          routineRevision,
          exercises,
        );

        if (nextDraft.setLogs.length === 0) {
          if (isCurrent) {
            setDraft(null);
            setEmptyReason("no-exercises");
          }
          return;
        }

        const persistedDraft = await getOrCreateWorkoutDraft(
          nextDraft.session,
          nextDraft.setLogs,
        );

        if (isCurrent) {
          setDraft(persistedDraft);
          setCurrentGroupIndex(0);
          setEmptyReason("idle");
          onWorkoutChanged?.();
        }
      } catch {
        if (isCurrent) {
          setDraft(null);
          setEmptyReason("load-error");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void startWorkout();

    return () => {
      isCurrent = false;
    };
  }, [startRequest]);

  useEffect(() => {
    if (currentGroupIndex >= exerciseGroups.length) {
      setCurrentGroupIndex(Math.max(0, exerciseGroups.length - 1));
    }
  }, [currentGroupIndex, exerciseGroups.length]);

  useEffect(() => {
    if (!isResting) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRestSecondsRemaining((currentSeconds) => {
        if (currentSeconds <= 1) {
          setIsResting(false);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isResting]);

  useEffect(() => {
    setIsResting(false);
    setRestSecondsRemaining(0);
  }, [currentGroup?.key]);

  function updateSetLog(setLogId: string, updates: Partial<SetLog>) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      const updatedSetLogs = currentDraft.setLogs.map((setLog) =>
        setLog.id === setLogId
          ? {
              ...setLog,
              ...updates,
            }
          : setLog,
      );
      setFinishError(null);
      void saveWorkoutDraft(currentDraft.session.id, updatedSetLogs);

      return {
        ...currentDraft,
        setLogs: updatedSetLogs,
      };
    });
  }

  async function finishWorkout() {
    if (!draft) {
      return;
    }

    if (!hasValidCompletedSeries) {
      setFinishError("Completa al menos una serie con kg y repeticiones válidas.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await completeWorkoutSession(draft.session.id, draft.setLogs);
      if (result) {
        setDraft(null);
        setCompletionSummary({
          session: result.session,
          setLogs: result.setLogs,
        });
        onWorkoutChanged?.();
      } else {
        setFinishError("Completa al menos una serie con kg y repeticiones válidas.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDiscard() {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    try {
      await discardWorkoutSession(draft.session.id);
      setDraft(null);
      setShowDiscardConfirm(false);
      onWorkoutChanged?.();
      onExit("today");
    } finally {
      setIsSaving(false);
    }
  }

  function startRestTimer() {
    setRestSecondsRemaining(currentRestTarget);
    setIsResting(true);
  }

  if (isLoading) {
    return (
      <section className="page-section workout-page">
        <WorkoutHeader title="Entrenamiento" />
        <article className="panel">
          <div className="empty-state">
            <strong>Cargando entrenamiento</strong>
            <p>Buscando una sesión activa en los datos locales.</p>
          </div>
        </article>
      </section>
    );
  }

  if (completionSummary) {
    return (
      <WorkoutSummaryView
        summary={completionSummary}
        onToday={() => onExit("today")}
        onRoutines={() => onExit("routines")}
      />
    );
  }

  if (!draft || !currentGroup) {
    return (
      <WorkoutEmptyView
        reason={emptyReason}
        onToday={() => onExit("today")}
        onRoutines={() => onExit("routines")}
      />
    );
  }

  return (
    <section className="page-section workout-page">
      <WorkoutHeader title="Entrenamiento activo" />

      <div className="workout-status-strip">
        <div>
          <span>Rutina</span>
          <strong>{draft.session.routineNameSnapshot}</strong>
        </div>
        <div>
          <span>Día</span>
          <strong>{draft.session.routineDayLabelSnapshot ?? "Sesión"}</strong>
        </div>
        <div>
          <span>Series marcadas</span>
          <strong>{completedSetCount}</strong>
        </div>
      </div>

      <div className="workout-layout">
        <aside className="panel workout-queue-panel">
          <p className="panel-label">Cola</p>
          <div className="workout-queue">
            {exerciseGroups.map((group, index) => (
              <button
                key={group.key}
                type="button"
                data-active={index === currentGroupIndex}
                onClick={() => setCurrentGroupIndex(index)}
              >
                <strong>{group.exerciseName}</strong>
                <span>
                  {group.setLogs.filter((setLog) => setLog.completed).length}/
                  {group.setLogs.length} series
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="panel workout-main-panel">
          <div className="workout-current-header">
            <div>
              <p className="panel-label">Ejercicio actual</p>
              <h2>{currentGroup.exerciseName}</h2>
              <p className="muted">
                Objetivo {currentGroup.targetSnapshot?.targetSets ?? currentGroup.setLogs.length}{" "}
                series · {currentGroup.targetSnapshot?.targetRepsMin ?? "-"}-
                {currentGroup.targetSnapshot?.targetRepsMax ?? "-"} reps · descanso{" "}
                {currentRestTarget}s
              </p>
            </div>
            <div className="workout-step-actions">
              <button
                className="icon-button"
                type="button"
                aria-label="Ejercicio anterior"
                disabled={currentGroupIndex === 0}
                onClick={() => setCurrentGroupIndex((index) => Math.max(0, index - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Siguiente ejercicio"
                disabled={currentGroupIndex >= exerciseGroups.length - 1}
                onClick={() =>
                  setCurrentGroupIndex((index) =>
                    Math.min(exerciseGroups.length - 1, index + 1),
                  )
                }
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="workout-set-list">
            {currentGroup.setLogs.map((setLog, index) => (
              <WorkoutSetRow
                key={setLog.id}
                setLog={setLog}
                label={`Serie ${index + 1}`}
                onUpdate={updateSetLog}
              />
            ))}
          </div>

          <div className="workout-rest-panel">
            <div>
              <p className="panel-label">Descanso</p>
              <strong>
                {isResting
                  ? formatWorkoutDuration(restSecondsRemaining)
                  : `${currentRestTarget}s sugeridos`}
              </strong>
            </div>
            <div className="button-row compact-actions">
              <button className="secondary-button" type="button" onClick={startRestTimer}>
                <Timer size={16} />
                Iniciar
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setIsResting(false);
                  setRestSecondsRemaining(0);
                }}
              >
                <RotateCcw size={16} />
                Reiniciar
              </button>
            </div>
          </div>
        </main>

        <aside className="panel workout-guide-panel">
          <p className="panel-label">Guía</p>
          <h2>{currentGroup.guideSnapshot?.name ?? currentGroup.exerciseName}</h2>
          {currentGroup.guideSnapshot ? (
            <div className="workout-guide-sections">
              {currentGroup.guideSnapshot.equipmentDetail ? (
                <GuideSection
                  title="Estación"
                  items={[currentGroup.guideSnapshot.equipmentDetail]}
                />
              ) : null}
              <GuideSection title="Preparación" items={currentGroup.guideSnapshot.guide.setup} />
              <GuideSection title="Técnica" items={currentGroup.guideSnapshot.guide.technique} />
              <GuideSection
                title="Errores comunes"
                items={currentGroup.guideSnapshot.guide.commonMistakes}
              />
            </div>
          ) : (
            <p className="muted">Guía no disponible para este ejercicio guardado.</p>
          )}
        </aside>
      </div>

      <div className="workout-bottom-bar">
        <button
          className="secondary-button"
          type="button"
          onClick={() => setShowDiscardConfirm(true)}
        >
          <X size={16} />
          Descartar
        </button>
        <div className="workout-finish-control">
          {!hasValidCompletedSeries || finishError ? (
            <p className="workout-finish-hint">
              {finishError ?? "Completa al menos una serie válida para finalizar."}
            </p>
          ) : null}
          <button
            className="primary-button training"
            type="button"
            onClick={finishWorkout}
            disabled={isSaving || !hasValidCompletedSeries}
          >
            <Save size={16} />
            Finalizar sesión
          </button>
        </div>
      </div>

      {showDiscardConfirm ? (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog-card confirm-card" role="dialog" aria-modal="true">
            <div className="dialog-header">
              <div>
                <p className="panel-label destructive-label">Descartar sesión</p>
                <h2>¿Salir sin guardar progreso?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cerrar"
                onClick={() => setShowDiscardConfirm(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="muted">
              La sesión quedará descartada y no contará para progreso ni volumen.
            </p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={confirmDiscard}
                disabled={isSaving}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WorkoutSetRow({
  setLog,
  label,
  onUpdate,
}: {
  setLog: SetLog;
  label: string;
  onUpdate: (setLogId: string, updates: Partial<SetLog>) => void;
}) {
  return (
    <article className="workout-set-row">
      <strong>{label}</strong>
      <NumberInput
        label="kg"
        value={setLog.weightKg}
        min={0}
        onChange={(weightKg) => onUpdate(setLog.id, { weightKg })}
      />
      <NumberInput
        label="reps"
        value={setLog.reps}
        min={0}
        onChange={(reps) => onUpdate(setLog.id, { reps })}
      />
      <NumberInput
        label="RIR"
        value={setLog.rir}
        min={0}
        onChange={(rir) => onUpdate(setLog.id, { rir })}
      />
      <label className="set-complete-control">
        <input
          type="checkbox"
          checked={setLog.completed}
          onChange={(event) =>
            onUpdate(setLog.id, {
              completed: event.target.checked,
              completedAt: event.target.checked ? new Date().toISOString() : null,
            })
          }
        />
        <span>Hecho</span>
      </label>
    </article>
  );
}

function NumberInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="workout-number-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(event) => {
          if (event.target.value === "") {
            onChange(null);
            return;
          }

          const parsedValue = Number(event.target.value);
          onChange(Number.isFinite(parsedValue) ? Math.max(min, parsedValue) : null);
        }}
      />
    </label>
  );
}

function WorkoutSummaryView({
  summary,
  onToday,
  onRoutines,
}: {
  summary: WorkoutCompletionSummary;
  onToday: () => void;
  onRoutines: () => void;
}) {
  const groups = groupWorkoutSetLogs(summary.setLogs);

  return (
    <section className="page-section workout-page">
      <WorkoutHeader title="Sesión guardada" />

      <div className="metric-grid">
        <article className="metric-card" data-tone="training">
          <p>Duración</p>
          <strong>{formatWorkoutDuration(summary.session.durationSeconds)}</strong>
        </article>
        <article className="metric-card" data-tone="routine">
          <p>Series</p>
          <strong>{summary.session.completedSetCount}</strong>
        </article>
        <article className="metric-card" data-tone="progress">
          <p>Volumen</p>
          <strong>{Math.round(summary.session.volumeKg)} kg</strong>
        </article>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-label">Resumen</p>
            <h2>{summary.session.routineNameSnapshot}</h2>
          </div>
          <CheckCircle2 size={20} className="success-icon" />
        </div>
        <div className="summary-exercise-list">
          {groups.map((group) => (
            <div className="summary-exercise-row" key={group.key}>
              <strong>{group.exerciseName}</strong>
              <span>
                {group.setLogs.filter((setLog) => setLog.completed).length} series completadas
              </span>
            </div>
          ))}
        </div>
      </article>

      <div className="button-row">
        <button className="primary-button training" type="button" onClick={onToday}>
          Volver a Hoy
        </button>
        <button className="secondary-button" type="button" onClick={onRoutines}>
          Ver rutinas
        </button>
      </div>
    </section>
  );
}

function WorkoutEmptyView({
  reason,
  onToday,
  onRoutines,
}: {
  reason: EmptyWorkoutReason;
  onToday: () => void;
  onRoutines: () => void;
}) {
  const copy =
    reason === "no-exercises"
      ? {
          title: "Rutina sin ejercicios",
          body: "Agrega ejercicios desde el constructor de rutina antes de entrenar.",
          icon: AlertCircle,
        }
      : reason === "load-error"
        ? {
            title: "No se pudo cargar la sesión",
            body: "Revisa las rutinas guardadas y vuelve a intentarlo.",
            icon: AlertCircle,
          }
        : {
            title: "No hay entrenamiento activo",
            body: "Inicia una rutina desde Hoy o desde la lista de rutinas.",
            icon: CircleStop,
          };
  const Icon = copy.icon;

  return (
    <section className="page-section workout-page">
      <WorkoutHeader title="Entrenamiento" />
      <article className="panel workout-empty-panel">
        <Icon size={22} />
        <strong>{copy.title}</strong>
        <p>{copy.body}</p>
        <div className="button-row">
          <button className="primary-button routine" type="button" onClick={onRoutines}>
            Editar rutinas
          </button>
          <button className="secondary-button" type="button" onClick={onToday}>
            Volver a Hoy
          </button>
        </div>
      </article>
    </section>
  );
}

function WorkoutHeader({ title }: { title: string }) {
  return (
    <header className="page-title">
      <div>
        <p>Entrenar</p>
        <h1 id="page-title">{title}</h1>
      </div>
      <Dumbbell size={22} className="workout-title-icon" />
    </header>
  );
}

function isValidCompletedSeries(setLog: SetLog): boolean {
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

function GuideSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="workout-guide-section">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
