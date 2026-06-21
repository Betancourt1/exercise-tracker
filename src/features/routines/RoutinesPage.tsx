import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Dumbbell,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

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
      setIsPresetsOpen(false);
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
    setOpenMenuId(null);
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

  // Close popover when clicking outside
  function handleOverlayClick() {
    setOpenMenuId(null);
  }

  const routineExerciseSummary = (summary: RoutineSummary): string => {
    const allExercises = summary.days.flatMap((day) =>
      summary.routineExercises
        .filter((re) => re.routineDayId === day.id)
        .map((re) => {
          // Try to find the exercise name from setLogs or snapshot — use exerciseId as fallback
          return re.exerciseId;
        }),
    );
    if (allExercises.length === 0) return "Sin ejercicios configurados";
    return `${allExercises.length} ejercicio${allExercises.length === 1 ? "" : "s"}`;
  };

  return (
    <section className="page-section routines-hevy" onClick={openMenuId ? handleOverlayClick : undefined}>
      {/* Top: header */}
      <header className="page-title">
        <div>
          <p>Rutinas</p>
          <h1 id="page-title">Entrenamiento</h1>
        </div>
      </header>

      {/* Empezar entrenamiento vacío */}
      <button
        className="start-empty-workout-btn"
        type="button"
        onClick={() => {
          /* For now, direct to today */
        }}
      >
        <Plus size={18} />
        Empezar entrenamiento vacío
      </button>

      {/* Search */}
      <div className="routines-toolbar">
        <label className="search-box" style={{ flex: 1 }}>
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
          <div className="routine-order-controls">
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
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {/* Section header: Rutinas + add */}
      <div className="routines-section-header">
        <h2>Rutinas</h2>
        <button className="icon-button" type="button" aria-label="Crear rutina" onClick={openCreateForm}>
          <Plus size={16} />
        </button>
      </div>

      {/* Nueva Rutina / Explorar */}
      {!isOrderMode ? (
        <div className="routine-presets-row">
          <button type="button" onClick={openCreateForm}>
            <Plus size={16} />
            Nueva Rutina
          </button>
          <button type="button" onClick={() => setIsPresetsOpen(true)}>
            <Dumbbell size={16} />
            Explorar
          </button>
        </div>
      ) : null}

      {/* Routine list as cards */}
      {isLoading ? (
        <div className="empty-state">
          <strong>Cargando rutinas</strong>
          <p>Revisando los datos locales guardados en este navegador.</p>
        </div>
      ) : visibleSummaries.length === 0 ? (
        <div className="routines-empty-cta">
          <Dumbbell size={40} style={{ color: "var(--muted)", opacity: 0.4 }} />
          <strong>{searchQuery ? "No hay coincidencias" : "Aún no tienes rutinas"}</strong>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", maxWidth: 280, textAlign: "center" }}>
            {searchQuery
              ? "Ajusta la búsqueda para volver a ver tus rutinas."
              : "Crea la primera rutina para empezar a entrenar."}
          </p>
          {!searchQuery ? (
            <button className="primary-button routine" type="button" onClick={openCreateForm}>
              <Plus size={16} />
              Crear rutina
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Folder header */}
          <div className="routine-folder-header">
            <div className="routine-folder-header-left">
              <span>Mis rutinas</span>
              <span className="routine-folder-count">{visibleSummaries.length}</span>
            </div>
            {summaries.length >= 2 && !isOrderMode ? (
              <button
                className="quiet-button"
                type="button"
                onClick={startOrderMode}
                style={{ fontSize: "0.8125rem" }}
              >
                Ordenar
              </button>
            ) : null}
          </div>

          <div className="routine-card-list">
            {visibleSummaries.map((summary, index) => (
              <RoutineCard
                key={summary.routine.id}
                summary={summary}
                index={index}
                isOrderMode={isOrderMode}
                canMoveUp={index > 0}
                canMoveDown={index < visibleSummaries.length - 1}
                isMenuOpen={openMenuId === summary.routine.id}
                exerciseSummary={routineExerciseSummary(summary)}
                onMove={moveRoutine}
                onEdit={setBuilderTarget}
                onStartWorkout={onStartWorkout}
                onDelete={setDeleteTarget}
                onMenuToggle={(id) => {
                  setOpenMenuId((current) => (current === id ? null : id));
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Create routine dialog */}
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

      {/* Delete confirm dialog */}
      {deleteTarget ? (
        <ConfirmDeleteDialog
          routineName={deleteTarget.routine.name}
          isSaving={isSaving}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {/* Routine builder dialog */}
      {builderTarget ? (
        <RoutineBuilderDialog
          summary={builderTarget}
          onClose={() => setBuilderTarget(null)}
          onSaved={handleBuilderSaved}
        />
      ) : null}

      {/* Presets modal */}
      {isPresetsOpen ? (
        <PresetsModal
          presets={ROUTINE_PRESETS}
          isSaving={isSaving}
          onCreate={handleCreateFromPreset}
          onClose={() => setIsPresetsOpen(false)}
        />
      ) : null}

      {/* Deleted routine toast */}
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

function RoutineCard({
  summary,
  index,
  isOrderMode,
  canMoveUp,
  canMoveDown,
  isMenuOpen,
  exerciseSummary,
  onMove,
  onEdit,
  onStartWorkout,
  onDelete,
  onMenuToggle,
}: {
  summary: RoutineSummary;
  index: number;
  isOrderMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isMenuOpen: boolean;
  exerciseSummary: string;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (summary: RoutineSummary) => void;
  onStartWorkout?: (summary: RoutineSummary) => void;
  onDelete: (summary: RoutineSummary) => void;
  onMenuToggle: (id: string) => void;
}) {
  const routine = summary.routine;

  // Build exercise preview text
  const dayLabels = summary.days.map((d) => d.label).join(" · ");
  const previewText = summary.exerciseCount > 0
    ? `${summary.exerciseCount} ejercicios · ${dayLabels}`
    : `Sin ejercicios · ${dayLabels}`;

  return (
    <div className="routine-card" style={{ position: "relative" }}>
      <div className="routine-card-top">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <span className="routine-card-name">{routine.name}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {routine.goal || "General"}
          </span>
        </div>

        {isOrderMode ? (
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className="icon-button"
              type="button"
              aria-label={`Subir ${routine.name}`}
              disabled={!canMoveUp}
              onClick={(e) => { e.stopPropagation(); onMove(index, -1); }}
            >
              <ArrowUp size={15} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={`Bajar ${routine.name}`}
              disabled={!canMoveDown}
              onClick={(e) => { e.stopPropagation(); onMove(index, 1); }}
            >
              <ArrowDown size={15} />
            </button>
          </div>
        ) : (
          <button
            className="routine-card-menu-btn"
            type="button"
            aria-label="Opciones de rutina"
            onClick={(e) => { e.stopPropagation(); onMenuToggle(routine.id); }}
          >
            <MoreHorizontal size={18} />
          </button>
        )}
      </div>

      <p className="routine-card-exercises">{previewText}</p>

      <button
        className="routine-card-start-btn"
        type="button"
        disabled={!onStartWorkout || summary.exerciseCount === 0}
        onClick={() => onStartWorkout?.(summary)}
      >
        <Play size={15} />
        {summary.exerciseCount === 0 ? "Agrega ejercicios para entrenar" : "Empezar Rutina"}
      </button>

      {/* Popover menu */}
      {isMenuOpen && !isOrderMode && (
        <div
          className="routine-menu-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { onEdit(summary); onMenuToggle(routine.id); }}
          >
            <Pencil size={15} />
            Editar
          </button>
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={() => { onMove(index, -1); onMenuToggle(routine.id); }}
          >
            <ArrowUp size={15} />
            Subir
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={() => { onMove(index, 1); onMenuToggle(routine.id); }}
          >
            <ArrowDown size={15} />
            Bajar
          </button>
          <button
            className="danger"
            type="button"
            onClick={() => { onDelete(summary); onMenuToggle(routine.id); }}
          >
            <Trash2 size={15} />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function PresetsModal({
  presets,
  isSaving,
  onCreate,
  onClose,
}: {
  presets: RoutinePreset[];
  isSaving: boolean;
  onCreate: (preset: RoutinePreset) => void;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog-card" role="dialog" aria-modal="true" style={{ maxWidth: 580 }}>
        <div className="dialog-header">
          <div>
            <p className="panel-label">Plantillas</p>
            <h2>Explorar rutinas de muestra</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p className="muted">
          La carga se registra por serie al entrenar y aparece después en Progreso.
        </p>

        <div className="presets-modal-grid">
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
                className="primary-button routine"
                type="button"
                disabled={isSaving}
                onClick={() => onCreate(preset)}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Plus size={15} />
                Usar plantilla
              </button>
            </div>
          ))}
        </div>

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
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

// Keep for TS compatibility (used by RoutineCard internally)
const _formatStatus = formatStatus;
void _formatStatus;
