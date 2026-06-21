import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleStop,
  Plus,
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
import { createId, toIsoUtc } from "../../domain";
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
import type { WorkoutExerciseGroup } from "./workoutBuilders";
import type { Exercise } from "../../domain";

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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const exerciseGroups = useMemo(
    () => groupWorkoutSetLogs(draft?.setLogs ?? []),
    [draft?.setLogs],
  );
  const completedSetCount = draft?.setLogs.filter((setLog) => setLog.completed).length ?? 0;
  const totalVolumeKg = draft?.setLogs
    .filter((s) => s.completed && s.weightKg != null && s.reps != null)
    .reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0) ?? 0;
  const hasValidCompletedSeries = draft?.setLogs.some(isValidCompletedSeries) ?? false;

  // Elapsed timer
  useEffect(() => {
    if (!draft) return undefined;
    const intervalId = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [draft]);

  // Rest timer
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

  // Load existing draft (no startRequest)
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

  // Start new workout from a routine
  useEffect(() => {
    let isCurrent = true;

    async function startWorkout() {
      if (!startRequest) {
        return;
      }

      setIsLoading(true);
      setCompletionSummary(null);
      setShowDiscardConfirm(false);
      setElapsedSeconds(0);

      try {
        const existingDraft = await getLatestInProgressWorkoutDraft();
        if (existingDraft) {
          if (isCurrent) {
            setDraft(existingDraft);
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

  function addSetToExercise(group: WorkoutExerciseGroup) {
    setDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;

      // Find the last set of this exercise group
      const lastSet = group.setLogs[group.setLogs.length - 1];
      if (!lastSet) return currentDraft;

      const maxSetIndex = Math.max(...currentDraft.setLogs.map((s) => s.setIndex), 0);

      const newSetLog: SetLog = {
        id: createId(),
        sessionId: currentDraft.session.id,
        exerciseId: lastSet.exerciseId,
        routineExerciseId: lastSet.routineExerciseId,
        exerciseNameSnapshot: lastSet.exerciseNameSnapshot,
        guideSnapshot: lastSet.guideSnapshot,
        setIndex: maxSetIndex + 1,
        weightKg: lastSet.weightKg,
        reps: lastSet.reps,
        rir: lastSet.rir,
        completed: false,
        completedAt: null,
        targetSnapshot: lastSet.targetSnapshot,
        notes: "",
      };

      const updatedSetLogs = [...currentDraft.setLogs, newSetLog];
      void saveWorkoutDraft(currentDraft.session.id, updatedSetLogs);

      return {
        ...currentDraft,
        setLogs: updatedSetLogs,
      };
    });
  }

  function addExerciseToWorkout(exercise: Exercise) {
    setDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;

      const maxSetIndex = Math.max(...currentDraft.setLogs.map((s) => s.setIndex), 0);

      const newSetLog: SetLog = {
        id: createId(),
        sessionId: currentDraft.session.id,
        exerciseId: exercise.id,
        routineExerciseId: null,
        exerciseNameSnapshot: exercise.name,
        guideSnapshot: {
          id: exercise.id,
          name: exercise.name,
          equipmentDetail: exercise.equipmentDetail,
          primaryMuscles: exercise.primaryMuscles,
          secondaryMuscles: exercise.secondaryMuscles,
          guide: exercise.guide,
        },
        setIndex: maxSetIndex + 1,
        weightKg: null,
        reps: null,
        rir: null,
        completed: false,
        completedAt: null,
        targetSnapshot: null,
        notes: "",
      };

      const updatedSetLogs = [...currentDraft.setLogs, newSetLog];
      void saveWorkoutDraft(currentDraft.session.id, updatedSetLogs);

      return {
        ...currentDraft,
        setLogs: updatedSetLogs,
      };
    });

    setIsPickerOpen(false);
  }

  async function finishWorkout() {
    if (!draft) {
      return;
    }

    if (!hasValidCompletedSeries) {
      setFinishError("Completa al menos una serie con kg y repeticiones válidas.");
      setShowFinishConfirm(false);
      return;
    }

    setIsSaving(true);
    setShowFinishConfirm(false);
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

  function startRestTimer(restSeconds: number) {
    setRestSecondsRemaining(restSeconds);
    setIsResting(true);
  }

  if (isLoading) {
    return (
      <div className="workout-active">
        <div className="workout-topbar">
          <div className="workout-topbar-left">
            <span className="workout-topbar-title">Entrenamiento</span>
          </div>
        </div>
        <div className="empty-state" style={{ margin: "48px auto" }}>
          <strong>Cargando entrenamiento</strong>
          <p>Buscando una sesión activa en los datos locales.</p>
        </div>
      </div>
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

  if (!draft || exerciseGroups.length === 0) {
    return (
      <WorkoutEmptyView
        reason={emptyReason}
        onToday={() => onExit("today")}
        onRoutines={() => onExit("routines")}
      />
    );
  }

  const sessionName =
    draft.session.routineDayLabelSnapshot
      ? `${draft.session.routineNameSnapshot ?? "Entreno"} · ${draft.session.routineDayLabelSnapshot}`
      : draft.session.routineNameSnapshot ?? "Entreno";

  return (
    <div className="workout-active">
      {/* Top bar */}
      <div className="workout-topbar">
        <div className="workout-topbar-left">
          <button
            type="button"
            aria-label="Minimizar"
            onClick={() => onExit("today")}
          >
            <ChevronDown size={20} />
          </button>
          <span className="workout-topbar-title">{sessionName}</span>
        </div>
        <div className="workout-topbar-right">
          <div className="workout-timer">
            <Timer size={14} />
            <span>{formatWorkoutDuration(elapsedSeconds)}</span>
          </div>
          <button
            className="workout-finish-btn"
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            disabled={isSaving}
          >
            Terminar
          </button>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="workout-metrics-strip">
        <div className="workout-metric">
          <span>Duración</span>
          <strong>{formatWorkoutDuration(elapsedSeconds)}</strong>
        </div>
        <div className="workout-metric">
          <span>Volumen</span>
          <strong>{Math.round(totalVolumeKg)} kg</strong>
        </div>
        <div className="workout-metric">
          <span>Series</span>
          <strong>{completedSetCount}</strong>
        </div>
      </div>

      {/* All exercises scroll */}
      <div className="workout-exercises-scroll">
        {exerciseGroups.map((group) => (
          <WorkoutExerciseCard
            key={group.key}
            group={group}
            isResting={isResting}
            restSecondsRemaining={restSecondsRemaining}
            onUpdateSetLog={updateSetLog}
            onAddSet={() => addSetToExercise(group)}
            onStartRest={startRestTimer}
            onStopRest={() => { setIsResting(false); setRestSecondsRemaining(0); }}
          />
        ))}
      </div>

      {/* Add exercise FAB */}
      <button
        className="add-exercise-fab"
        type="button"
        onClick={() => setIsPickerOpen(true)}
      >
        <Plus size={18} />
        Agregar ejercicio
      </button>

      {/* Exercise Picker */}
      {isPickerOpen && (
        <InlineExercisePicker
          onSelect={addExerciseToWorkout}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {/* Finish confirm */}
      {showFinishConfirm && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog-card confirm-card" role="dialog" aria-modal="true">
            <div className="dialog-header">
              <div>
                <p className="panel-label">Finalizar sesión</p>
                <h2>¿Guardar esta sesión?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cerrar"
                onClick={() => setShowFinishConfirm(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="muted">
              Se guardarán {completedSetCount} series completadas con{" "}
              {Math.round(totalVolumeKg)} kg de volumen total.
            </p>
            {!hasValidCompletedSeries && (
              <p className="form-error">
                Completa al menos una serie con kg y repeticiones válidas.
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowDiscardConfirm(true)}
                style={{ marginRight: "auto" }}
              >
                <X size={15} />
                Descartar
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowFinishConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="primary-button training"
                type="button"
                onClick={finishWorkout}
                disabled={isSaving || !hasValidCompletedSeries}
              >
                <Save size={15} />
                Guardar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard confirm */}
      {showDiscardConfirm && (
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
      )}

      {finishError && (
        <div
          className="toast"
          role="alert"
          style={{ cursor: "pointer" }}
          onClick={() => setFinishError(null)}
        >
          <span>{finishError}</span>
        </div>
      )}
    </div>
  );
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────

function WorkoutExerciseCard({
  group,
  isResting,
  restSecondsRemaining,
  onUpdateSetLog,
  onAddSet,
  onStartRest,
  onStopRest,
}: {
  group: WorkoutExerciseGroup;
  isResting: boolean;
  restSecondsRemaining: number;
  onUpdateSetLog: (setLogId: string, updates: Partial<SetLog>) => void;
  onAddSet: () => void;
  onStartRest: (seconds: number) => void;
  onStopRest: () => void;
}) {
  const initials = group.exerciseName
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const restSeconds = group.targetSnapshot?.restSeconds ?? 60;
  const isCardio =
    group.guideSnapshot?.guide?.setup?.some((s) =>
      /cardio|correr|trotar|bicicleta|elíptica/i.test(s),
    ) ?? false;

  return (
    <div className="workout-exercise-card">
      {/* Header */}
      <div className="exercise-card-header">
        <div className="exercise-avatar">{initials}</div>
        <span className="exercise-card-name">{group.exerciseName}</span>
        {group.targetSnapshot && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              whiteSpace: "nowrap",
            }}
          >
            {group.targetSnapshot.targetSets}×{group.targetSnapshot.targetRepsMin}
            {group.targetSnapshot.targetRepsMax !== group.targetSnapshot.targetRepsMin
              ? `-${group.targetSnapshot.targetRepsMax}`
              : ""}
          </span>
        )}
      </div>

      {/* Rest indicator */}
      <div className="exercise-rest-indicator">
        <Timer size={13} />
        {isResting
          ? `Descansando: ${formatWorkoutDuration(restSecondsRemaining)}`
          : `Descanso: ${restSeconds}s`}
        {isResting ? (
          <button
            type="button"
            onClick={onStopRest}
            style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "0.75rem" }}
          >
            Detener
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStartRest(restSeconds)}
            style={{ marginLeft: "auto", color: "var(--accent-text)", fontSize: "0.75rem" }}
          >
            Iniciar
          </button>
        )}
      </div>

      {/* Sets table */}
      <table className="sets-table">
        <thead className="sets-table-head">
          <tr>
            <th>SERIE</th>
            <th>ANTERIOR</th>
            {isCardio ? (
              <>
                <th>KM</th>
                <th>TIEMPO</th>
              </>
            ) : (
              <>
                <th>KG</th>
                <th>REPS</th>
              </>
            )}
            <th>✓</th>
          </tr>
        </thead>
        <tbody>
          {group.setLogs.map((setLog, index) => (
            <WorkoutSetRow
              key={setLog.id}
              setLog={setLog}
              setNumber={index + 1}
              isCardio={isCardio}
              onUpdate={onUpdateSetLog}
            />
          ))}
        </tbody>
      </table>

      {/* Add set */}
      <button className="add-set-btn" type="button" onClick={onAddSet}>
        <Plus size={14} />
        Agregar Serie
      </button>
    </div>
  );
}

// ─── Set Row ───────────────────────────────────────────────────────────────────

function WorkoutSetRow({
  setLog,
  setNumber,
  isCardio,
  onUpdate,
}: {
  setLog: SetLog;
  setNumber: number;
  isCardio: boolean;
  onUpdate: (setLogId: string, updates: Partial<SetLog>) => void;
}) {
  const previousText = setLog.weightKg != null && setLog.reps != null
    ? `${setLog.weightKg}kg×${setLog.reps}`
    : "—";

  return (
    <tr className={`set-row${setLog.completed ? " completed" : ""}`}>
      <td>{setNumber}</td>
      <td>
        <span className="set-previous">{previousText}</span>
      </td>
      <td>
        <input
          className="set-number-input"
          type="number"
          min={0}
          step={isCardio ? 0.1 : 0.5}
          placeholder={isCardio ? "0" : "kg"}
          value={setLog.weightKg ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Math.max(0, Number(e.target.value));
            onUpdate(setLog.id, { weightKg: v });
          }}
        />
      </td>
      <td>
        <input
          className="set-number-input"
          type="number"
          min={0}
          step={1}
          placeholder={isCardio ? "min" : "reps"}
          value={setLog.reps ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Math.max(0, Number(e.target.value));
            onUpdate(setLog.id, { reps: v });
          }}
        />
      </td>
      <td>
        <button
          className={`set-check-btn${setLog.completed ? " checked" : ""}`}
          type="button"
          aria-label={setLog.completed ? "Serie completada" : "Marcar como completada"}
          onClick={() =>
            onUpdate(setLog.id, {
              completed: !setLog.completed,
              completedAt: !setLog.completed ? new Date().toISOString() : null,
            })
          }
        >
          {setLog.completed && <Check size={14} />}
        </button>
      </td>
    </tr>
  );
}

// ─── Inline Exercise Picker ────────────────────────────────────────────────────

function InlineExercisePicker({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    listExercises()
      .then((list) => {
        if (isCurrent) {
          setExercises(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscles.some((m) => m.toLowerCase().includes(q)),
    );
  }, [exercises, query]);

  return (
    <div className="exercise-picker-sheet">
      <div className="picker-header">
        <button className="picker-header-action" type="button" onClick={onClose}>
          Cancelar
        </button>
        <span className="picker-header-title">Agregar Ejercicio</span>
        <div style={{ minWidth: 64 }} />
      </div>

      <div className="picker-search-wrap">
        <label className="search-box">
          <span style={{ color: "var(--muted)", lineHeight: 1 }}>🔍</span>
          <input
            placeholder="Buscar ejercicio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </label>
      </div>

      <div className="picker-body">
        {isLoading ? (
          <div className="empty-state">
            <strong>Cargando ejercicios...</strong>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <strong>Sin resultados</strong>
            <p>Ajusta la búsqueda.</p>
          </div>
        ) : (
          <>
            <div className="picker-section-label">Ejercicios ({filtered.length})</div>
            {filtered.map((exercise) => (
              <button
                key={exercise.id}
                className="picker-exercise-row"
                type="button"
                onClick={() => onSelect(exercise)}
              >
                <div className="exercise-avatar" style={{ flexShrink: 0 }}>
                  {exercise.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="picker-exercise-info">
                  <span className="picker-exercise-name">{exercise.name}</span>
                  <span className="picker-exercise-muscle">
                    {exercise.primaryMuscles.join(", ")}
                  </span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Summary & Empty Views ─────────────────────────────────────────────────────

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
      <header className="page-title">
        <div>
          <p>Entrenamiento</p>
          <h1 id="page-title">Sesión guardada</h1>
        </div>
        <CheckCircle2 size={24} style={{ color: "var(--success)" }} />
      </header>

      <div className="metric-grid">
        <article className="metric-item" data-tone="training">
          <p>Duración</p>
          <strong>{formatWorkoutDuration(summary.session.durationSeconds)}</strong>
        </article>
        <article className="metric-item" data-tone="routine">
          <p>Series</p>
          <strong>{summary.session.completedSetCount}</strong>
        </article>
        <article className="metric-item" data-tone="progress">
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

      <div className="button-row" style={{ marginTop: 16 }}>
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
      <header className="page-title">
        <div>
          <p>Entrenar</p>
          <h1 id="page-title">Entrenamiento</h1>
        </div>
      </header>
      <article className="panel workout-empty-panel">
        <Icon size={22} style={{ color: "var(--muted)" }} />
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// Keep toIsoUtc usage to avoid unused import warning
const _toIsoUtc = toIsoUtc;
void _toIsoUtc;
