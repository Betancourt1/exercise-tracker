import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  listSeededAvailableExercises,
  restoreRoutine,
  saveRoutineGraph,
  softDeleteRoutine,
  updateRoutineManualOrders,
} from "../../data";
import type { RoutineStatus } from "../../domain";
import { RoutineBuilderDialog } from "./RoutineBuilderDialog";
import { buildRoutineGraph, ROUTINE_DAY_OPTIONS } from "./routineBuilders";
import { loadRoutineSummaries } from "./routineQueries";
import {
  ROUTINE_PRESETS,
  buildRoutineGraphFromPreset,
  type RoutinePreset,
} from "./routinePresets";
import type { RoutineSummary } from "./types";

type RoutinesPageProps = {
  onRoutinesChanged?: () => void;
  onStartWorkout?: (summary: RoutineSummary) => void;
};

type RoutineFormState = {
  name: string;
  goal: string;
  selectedDayIndexes: number[];
};

type DeletedRoutineToast = {
  routineId: string;
  name: string;
};

const initialFormState: RoutineFormState = {
  name: "",
  goal: "",
  selectedDayIndexes: [0],
};

export function RoutinesPage({ onRoutinesChanged, onStartWorkout }: RoutinesPageProps) {
  const [summaries, setSummaries] = useState<RoutineSummary[]>([]);
  const [draftOrder, setDraftOrder] = useState<RoutineSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState<RoutineFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoutineSummary | null>(null);
  const [builderTarget, setBuilderTarget] = useState<RoutineSummary | null>(null);
  const [deletedRoutine, setDeletedRoutine] = useState<DeletedRoutineToast | null>(null);
  const [isOrderMode, setIsOrderMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function refreshRoutines() {
    setIsLoading(true);
    setError(null);

    try {
      const nextSummaries = await loadRoutineSummaries();
      setSummaries(nextSummaries);
      setDraftOrder(nextSummaries);
    } catch {
      setError("No se pudieron cargar las rutinas locales.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshRoutines();
  }, []);

  const visibleSummaries = useMemo(() => {
    if (isOrderMode) {
      return draftOrder;
    }

    const query = searchQuery.trim().toLocaleLowerCase("es-MX");
    if (!query) {
      return summaries;
    }

    return summaries.filter((summary) => {
      const routine = summary.routine;
      return (
        routine.name.toLocaleLowerCase("es-MX").includes(query) ||
        routine.goal.toLocaleLowerCase("es-MX").includes(query)
      );
    });
  }, [draftOrder, isOrderMode, searchQuery, summaries]);

  const nextManualOrder = useMemo(
    () =>
      summaries.reduce(
        (highestOrder, summary) => Math.max(highestOrder, summary.routine.manualOrder),
        0,
      ) + 1,
    [summaries],
  );

  function openCreateForm() {
    setFormState(initialFormState);
    setFormError(null);
    setIsCreateOpen(true);
  }

  async function handleCreateRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const name = formState.name.trim();
    const goal = formState.goal.trim();

    if (!name) {
      setFormError("Agrega un nombre para la rutina.");
      return;
    }

    if (formState.selectedDayIndexes.length === 0) {
      setFormError("Selecciona al menos un día activo.");
      return;
    }

    setIsSaving(true);

    try {
      const routineGraph = buildRoutineGraph({
        name,
        goal: goal || "General",
        selectedDayIndexes: formState.selectedDayIndexes,
        manualOrder: nextManualOrder,
      });

      await saveRoutineGraph(routineGraph);
      setIsCreateOpen(false);
      setFormState(initialFormState);
      await refreshRoutines();
      onRoutinesChanged?.();
    } catch {
      setFormError("No se pudo guardar la rutina.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateFromPreset(preset: RoutinePreset) {
    setIsSaving(true);
    setError(null);

    try {
      const exercises = await listSeededAvailableExercises();
      const routineGraph = buildRoutineGraphFromPreset(preset, exercises, nextManualOrder);

      await saveRoutineGraph(routineGraph);
      await refreshRoutines();
      onRoutinesChanged?.();
    } catch {
      setError("No se pudo crear la rutina desde la plantilla.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsSaving(true);

    try {
      await softDeleteRoutine(deleteTarget.routine.id);
      setDeletedRoutine({
        routineId: deleteTarget.routine.id,
        name: deleteTarget.routine.name,
      });
      setDeleteTarget(null);
      await refreshRoutines();
      onRoutinesChanged?.();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUndoDelete() {
    if (!deletedRoutine) {
      return;
    }

    setIsSaving(true);

    try {
      await restoreRoutine(deletedRoutine.routineId);
      setDeletedRoutine(null);
      await refreshRoutines();
      onRoutinesChanged?.();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBuilderSaved() {
    setBuilderTarget(null);
    await refreshRoutines();
    onRoutinesChanged?.();
  }

  function startOrderMode() {
    setSearchQuery("");
    setDraftOrder(summaries);
    setIsOrderMode(true);
  }

  function cancelOrderMode() {
    setDraftOrder(summaries);
    setIsOrderMode(false);
  }

  function moveRoutine(index: number, direction: -1 | 1) {
    setDraftOrder((currentOrder) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= currentOrder.length) {
        return currentOrder;
      }

      const nextOrder = [...currentOrder];
      [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
      return nextOrder;
    });
  }

  async function saveManualOrder() {
    setIsSaving(true);

    try {
      await updateRoutineManualOrders(
        draftOrder.map((summary, index) => ({
          routineId: summary.routine.id,
          manualOrder: index + 1,
        })),
      );
      setIsOrderMode(false);
      await refreshRoutines();
      onRoutinesChanged?.();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-section routines-page">
      <header className="page-title">
        <div>
          <p>Rutinas</p>
          <h1 id="page-title">Rutinas</h1>
        </div>
        <button className="primary-button routine" type="button" onClick={openCreateForm}>
          <Plus size={16} />
          Crear rutina
        </button>
      </header>

      <div className="toolbar routines-toolbar">
        <label className="search-box">
          <Search size={15} />
          <input
            placeholder={isOrderMode ? "Orden manual activo" : "Buscar rutina"}
            aria-label="Buscar rutina"
            value={searchQuery}
            disabled={isOrderMode}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>

        {isOrderMode ? (
          <div className="toolbar-actions">
            <button className="secondary-button" type="button" onClick={cancelOrderMode}>
              <X size={16} />
              Cancelar
            </button>
            <button
              className="primary-button routine"
              type="button"
              onClick={saveManualOrder}
              disabled={isSaving}
            >
              <Check size={16} />
              Guardar orden
            </button>
          </div>
        ) : (
          <button
            className="secondary-button"
            type="button"
            onClick={startOrderMode}
            disabled={summaries.length < 2}
          >
            <SlidersHorizontal size={16} />
            Orden manual
          </button>
        )}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {!isOrderMode ? (
        <PresetShelf
          presets={ROUTINE_PRESETS}
          isSaving={isSaving}
          onCreate={handleCreateFromPreset}
        />
      ) : null}

      <article className="panel routines-panel">
        <div className="routine-table-head">
          <span>Rutina</span>
          <span>Objetivo</span>
          <span>Días</span>
          <span>Ejercicios</span>
          <span>Acciones</span>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <strong>Cargando rutinas</strong>
            <p>Revisando los datos locales guardados en este navegador.</p>
          </div>
        ) : visibleSummaries.length === 0 ? (
          <div className="empty-state">
            <strong>
              {searchQuery ? "No hay coincidencias" : "Aún no tienes rutinas"}
            </strong>
            <p>
              {searchQuery
                ? "Ajusta la búsqueda para volver a ver tus rutinas."
                : "Crea la primera rutina para activar el constructor mínimo y ordenar tus bloques."}
            </p>
            {!searchQuery ? (
              <button className="primary-button routine" type="button" onClick={openCreateForm}>
                <Plus size={16} />
                Crear rutina
              </button>
            ) : null}
          </div>
        ) : (
          <div className="routine-list">
            {visibleSummaries.map((summary, index) => (
              <RoutineRow
                key={summary.routine.id}
                summary={summary}
                index={index}
                isOrderMode={isOrderMode}
                canMoveUp={index > 0}
                canMoveDown={index < visibleSummaries.length - 1}
                onMove={moveRoutine}
                onEdit={setBuilderTarget}
                onStartWorkout={onStartWorkout}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </article>

      {isCreateOpen ? (
        <CreateRoutineDialog
          formState={formState}
          formError={formError}
          isSaving={isSaving}
          onChange={setFormState}
          onSubmit={handleCreateRoutine}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDeleteDialog
          routineName={deleteTarget.routine.name}
          isSaving={isSaving}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {builderTarget ? (
        <RoutineBuilderDialog
          summary={builderTarget}
          onClose={() => setBuilderTarget(null)}
          onSaved={handleBuilderSaved}
        />
      ) : null}

      {deletedRoutine ? (
        <div className="toast" role="status">
          <span>{deletedRoutine.name} eliminada.</span>
          <button type="button" onClick={handleUndoDelete} disabled={isSaving}>
            Deshacer
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PresetShelf({
  presets,
  isSaving,
  onCreate,
}: {
  presets: RoutinePreset[];
  isSaving: boolean;
  onCreate: (preset: RoutinePreset) => void;
}) {
  return (
    <article className="routine-presets-panel" aria-labelledby="routine-presets-title">
      <div className="preset-shelf-header">
        <div>
          <p className="panel-label">Plantillas</p>
          <h2 id="routine-presets-title">Rutinas de muestra</h2>
        </div>
        <Dumbbell size={18} />
      </div>
      <div className="preset-grid">
        {presets.map((preset) => (
          <div className="preset-card" key={preset.id}>
            <div>
              <strong>{preset.name}</strong>
              <span>{preset.summary}</span>
            </div>
            <dl>
              <div>
                <dt>Días</dt>
                <dd>{preset.daysPerWeek}</dd>
              </div>
              <div>
                <dt>Duración</dt>
                <dd>{preset.duration}</dd>
              </div>
              <div>
                <dt>Equipo</dt>
                <dd>{preset.equipment}</dd>
              </div>
            </dl>
            <p>{preset.progression}</p>
            <button
              className="secondary-button"
              type="button"
              disabled={isSaving}
              onClick={() => onCreate(preset)}
            >
              <Plus size={16} />
              Usar plantilla
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

function RoutineRow({
  summary,
  index,
  isOrderMode,
  canMoveUp,
  canMoveDown,
  onMove,
  onEdit,
  onStartWorkout,
  onDelete,
}: {
  summary: RoutineSummary;
  index: number;
  isOrderMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (summary: RoutineSummary) => void;
  onStartWorkout?: (summary: RoutineSummary) => void;
  onDelete: (summary: RoutineSummary) => void;
}) {
  const routine = summary.routine;
  const dayCopy = formatCount(summary.days.length, "día", "días");
  const exerciseCopy = formatCount(summary.exerciseCount, "ejercicio", "ejercicios");

  return (
    <div className="routine-row">
      <div className="routine-main-cell">
        <strong>{routine.name}</strong>
        <span className="routine-status" data-status={routine.status}>
          {formatStatus(routine.status)}
        </span>
      </div>
      <span>{routine.goal || "General"}</span>
      <span>{dayCopy}</span>
      <span className="routine-exercise-cell">
        {exerciseCopy}
        {summary.exerciseCount === 0 ? (
          <small>Agrega ejercicios para entrenar.</small>
        ) : null}
      </span>
      <div className="routine-actions">
        {isOrderMode ? (
          <>
            <button
              className="icon-button"
              type="button"
              aria-label={`Subir ${routine.name}`}
              disabled={!canMoveUp}
              onClick={() => onMove(index, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={`Bajar ${routine.name}`}
              disabled={!canMoveDown}
              onClick={() => onMove(index, 1)}
            >
              <ArrowDown size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              className="icon-button training"
              type="button"
              title={
                summary.exerciseCount > 0
                  ? "Entrenar"
                  : "Agrega ejercicios antes de entrenar"
              }
              aria-label={`Entrenar ${routine.name}`}
              disabled={!onStartWorkout || summary.exerciseCount === 0}
              onClick={() => onStartWorkout?.(summary)}
            >
              <Play size={16} />
            </button>
            <button
              className="icon-button"
              type="button"
              title="Editar rutina"
              aria-label={`Editar ${routine.name}`}
              onClick={() => onEdit(summary)}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon-button danger"
              type="button"
              title="Eliminar rutina"
              aria-label={`Eliminar ${routine.name}`}
              onClick={() => onDelete(summary)}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CreateRoutineDialog({
  formState,
  formError,
  isSaving,
  onChange,
  onSubmit,
  onClose,
}: {
  formState: RoutineFormState;
  formError: string | null;
  isSaving: boolean;
  onChange: (nextState: RoutineFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  function toggleDay(dayIndex: number) {
    const nextSelectedDays = formState.selectedDayIndexes.includes(dayIndex)
      ? formState.selectedDayIndexes.filter((selectedDay) => selectedDay !== dayIndex)
      : [...formState.selectedDayIndexes, dayIndex].sort((a, b) => a - b);

    onChange({
      ...formState,
      selectedDayIndexes: nextSelectedDays,
    });
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form
        className="dialog-card routine-form"
        role="dialog"
        aria-modal="true"
        onSubmit={onSubmit}
      >
        <div className="dialog-header">
          <div>
            <p className="panel-label">Nueva rutina</p>
            <h2>Crear rutina</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <label className="form-field">
          <span>Nombre</span>
          <input
            value={formState.name}
            onChange={(event) => onChange({ ...formState, name: event.target.value })}
            placeholder="Fuerza 4 días"
            autoFocus
          />
        </label>

        <label className="form-field">
          <span>Objetivo</span>
          <input
            value={formState.goal}
            onChange={(event) => onChange({ ...formState, goal: event.target.value })}
            placeholder="Fuerza, hipertrofia, movilidad..."
          />
        </label>

        <fieldset className="day-selector">
          <legend>Días activos</legend>
          <div className="day-grid">
            {ROUTINE_DAY_OPTIONS.map((day, index) => (
              <label key={day.label} className="day-option">
                <input
                  type="checkbox"
                  checked={formState.selectedDayIndexes.includes(index)}
                  onChange={() => toggleDay(index)}
                />
                <span>{day.shortLabel}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="constructor-placeholder">
          <p className="panel-label">Constructor</p>
          <p>
            Después de guardar, abre Editar para agregar ejercicios y objetivos por día.
          </p>
        </div>

        {formError ? <p className="form-error">{formError}</p> : null}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button routine" type="submit" disabled={isSaving}>
            Guardar rutina
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDeleteDialog({
  routineName,
  isSaving,
  onCancel,
  onConfirm,
}: {
  routineName: string;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog-card confirm-card" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <div>
            <p className="panel-label destructive-label">Eliminar rutina</p>
            <h2>{routineName}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>
        <p className="muted">
          La rutina saldrá de la lista activa, pero el historial de sesiones se conserva.
          Podrás deshacerlo después de eliminar.
        </p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={isSaving}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatStatus(status: RoutineStatus): string {
  switch (status) {
    case "active":
      return "Activa";
    case "draft":
      return "Borrador";
    case "paused":
      return "Pausada";
    case "deleted":
      return "Eliminada";
  }
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
