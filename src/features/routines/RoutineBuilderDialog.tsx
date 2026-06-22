import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  RotateCcw,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { listSeededAvailableExercises, saveRoutineGraphRevision } from "../../data";
import {
  formatExerciseEquipmentDetail,
  type Exercise,
  type RoutineExercise,
} from "../../domain";
import {
  buildRoutineEditGraph,
  createRoutineExerciseDraft,
  moveRoutineExerciseInDay,
  removeRoutineExerciseFromDay,
} from "./routineBuilders";
import type { RoutineSummary } from "./types";
import {
  ALL_EXERCISE_FILTER_VALUE,
  filterExerciseLibrary,
  getExerciseFilterOptions,
  hasActiveExerciseFilters,
  type ExerciseLibraryFilters,
} from "./exerciseLibraryFilters";
import { ExerciseVisualPanel } from "../exerciseVisuals";

type RoutineBuilderDialogProps = {
  summary: RoutineSummary;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function RoutineBuilderDialog({
  summary,
  onClose,
  onSaved,
}: RoutineBuilderDialogProps) {
  const [activeDayId, setActiveDayId] = useState(summary.days[0]?.id ?? null);
  const [routineExercises, setRoutineExercises] = useState<RoutineExercise[]>(
    () => summary.routineExercises,
  );
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);
  const [exerciseFilters, setExerciseFilters] = useState<ExerciseLibraryFilters>({
    query: "",
    muscle: ALL_EXERCISE_FILTER_VALUE,
    equipment: ALL_EXERCISE_FILTER_VALUE,
    tag: ALL_EXERCISE_FILTER_VALUE,
  });
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    summary.routineExercises[0]?.exerciseId ?? null,
  );
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadExerciseLibrary() {
      setIsLibraryLoading(true);
      setError(null);

      try {
        const exercises = await listSeededAvailableExercises();
        if (!isCurrent) {
          return;
        }

        setExerciseLibrary(exercises);
        setSelectedExerciseId((currentId) => currentId ?? exercises[0]?.id ?? null);
      } catch {
        if (isCurrent) {
          setError("No se pudo cargar la biblioteca local de ejercicios.");
        }
      } finally {
        if (isCurrent) {
          setIsLibraryLoading(false);
        }
      }
    }

    void loadExerciseLibrary();

    return () => {
      isCurrent = false;
    };
  }, []);

  const activeDay = useMemo(
    () => summary.days.find((routineDay) => routineDay.id === activeDayId) ?? null,
    [activeDayId, summary.days],
  );
  const exerciseById = useMemo(
    () => new Map(exerciseLibrary.map((exercise) => [exercise.id, exercise])),
    [exerciseLibrary],
  );
  const activeDayExercises = useMemo(
    () =>
      activeDayId
        ? routineExercises
            .filter((routineExercise) => routineExercise.routineDayId === activeDayId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [activeDayId, routineExercises],
  );
  const filterOptions = useMemo(
    () => getExerciseFilterOptions(exerciseLibrary),
    [exerciseLibrary],
  );
  const filteredExercises = useMemo(() => {
    return filterExerciseLibrary(exerciseLibrary, exerciseFilters);
  }, [exerciseLibrary, exerciseFilters]);
  const activeFilterCount = [
    exerciseFilters.query.trim(),
    exerciseFilters.muscle !== ALL_EXERCISE_FILTER_VALUE ? exerciseFilters.muscle : "",
    exerciseFilters.equipment !== ALL_EXERCISE_FILTER_VALUE
      ? exerciseFilters.equipment
      : "",
    exerciseFilters.tag !== ALL_EXERCISE_FILTER_VALUE ? exerciseFilters.tag : "",
  ].filter(Boolean).length;
  const hasActiveFilters = hasActiveExerciseFilters(exerciseFilters);
  const guideExercise =
    filteredExercises.find((exercise) => exercise.id === selectedExerciseId) ??
    filteredExercises[0] ??
    null;

  function addExercise(exercise: Exercise) {
    if (!activeDayId) {
      setError("Selecciona un día antes de agregar ejercicios.");
      return;
    }

    setRoutineExercises((currentExercises) => [
      ...currentExercises,
      createRoutineExerciseDraft({
        routineDayId: activeDayId,
        exerciseId: exercise.id,
        sortOrder: activeDayExercises.length + 1,
      }),
    ]);
    setSelectedExerciseId(exercise.id);
  }

  function updateExerciseFilter(updates: Partial<ExerciseLibraryFilters>) {
    setExerciseFilters((currentFilters) => ({
      ...currentFilters,
      ...updates,
    }));
  }

  function clearExerciseFilters() {
    setExerciseFilters({
      query: "",
      muscle: ALL_EXERCISE_FILTER_VALUE,
      equipment: ALL_EXERCISE_FILTER_VALUE,
      tag: ALL_EXERCISE_FILTER_VALUE,
    });
  }

  function updateRoutineExercise(
    routineExerciseId: string,
    updates: Partial<RoutineExercise>,
  ) {
    setRoutineExercises((currentExercises) =>
      currentExercises.map((routineExercise) =>
        routineExercise.id === routineExerciseId
          ? {
              ...routineExercise,
              ...updates,
            }
          : routineExercise,
      ),
    );
  }

  function moveRoutineExercise(routineExerciseId: string, direction: -1 | 1) {
    if (!activeDayId) {
      return;
    }

    setRoutineExercises((currentExercises) =>
      moveRoutineExerciseInDay(
        currentExercises,
        activeDayId,
        routineExerciseId,
        direction,
      ),
    );
  }

  function removeRoutineExercise(routineExerciseId: string) {
    if (!activeDayId) {
      return;
    }

    setRoutineExercises((currentExercises) =>
      removeRoutineExerciseFromDay(currentExercises, activeDayId, routineExerciseId),
    );
  }

  async function saveBuilder() {
    setIsSaving(true);
    setError(null);

    try {
      await saveRoutineGraphRevision(
        buildRoutineEditGraph({
          summary,
          routineExercises,
        }),
      );
      await onSaved();
    } catch {
      setError("No se pudieron guardar los ejercicios de la rutina.");
      setIsSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog-card routine-builder-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="routine-builder-title"
      >
        <div className="dialog-header">
          <div>
            <p className="panel-label">Editar rutina</p>
            <h2 id="routine-builder-title">{summary.routine.name}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="routine-builder-layout">
          <section className="builder-column builder-days" aria-label="Días de rutina">
            <div className="builder-section-header">
              <h3>Días</h3>
              <span>{summary.days.length}</span>
            </div>
            {summary.days.length > 0 ? (
              <div className="builder-day-list">
                {summary.days.map((routineDay) => (
                  <button
                    key={routineDay.id}
                    type="button"
                    data-active={routineDay.id === activeDayId}
                    onClick={() => setActiveDayId(routineDay.id)}
                  >
                    <strong>{routineDay.label}</strong>
                    <span>
                      {
                        routineExercises.filter(
                          (routineExercise) =>
                            routineExercise.routineDayId === routineDay.id,
                        ).length
                      }{" "}
                      ejercicios
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <BuilderEmptyState
                title="Sin días activos"
                body="Esta rutina necesita al menos un día activo para agregar ejercicios."
              />
            )}
          </section>

          <section className="builder-column builder-editor" aria-label="Ejercicios del día">
            <div className="builder-section-header">
              <div>
                <h3>{activeDay?.label ?? "Selecciona un día"}</h3>
                <p>
                  {activeDay
                    ? "Define el orden y los objetivos de trabajo."
                    : "Elige un día para editar sus ejercicios."}
                </p>
              </div>
            </div>

            {activeDay ? (
              activeDayExercises.length > 0 ? (
                <div className="builder-exercise-list">
                  {activeDayExercises.map((routineExercise, index) => (
                    <RoutineExerciseEditor
                      key={routineExercise.id}
                      routineExercise={routineExercise}
                      exercise={exerciseById.get(routineExercise.exerciseId)}
                      canMoveUp={index > 0}
                      canMoveDown={index < activeDayExercises.length - 1}
                      onSelectGuide={() => setSelectedExerciseId(routineExercise.exerciseId)}
                      onMove={moveRoutineExercise}
                      onRemove={removeRoutineExercise}
                      onUpdate={updateRoutineExercise}
                    />
                  ))}
                </div>
              ) : (
                <BuilderEmptyState
                  title="Día sin ejercicios"
                  body="Agrega ejercicios desde la biblioteca para preparar este día."
                />
              )
            ) : (
              <BuilderEmptyState
                title="Sin día seleccionado"
                body="Selecciona un día activo para editar la rutina."
              />
            )}
          </section>

          <aside className="builder-column builder-library" aria-label="Biblioteca y guía">
            <div className="builder-section-header">
              <h3>Biblioteca</h3>
              <BookOpen size={16} />
            </div>
            <label className="search-box builder-search">
              <Search size={15} />
              <input
                placeholder="Buscar nombre, músculo o equipo"
                aria-label="Buscar ejercicio"
                value={exerciseFilters.query}
                onChange={(event) => updateExerciseFilter({ query: event.target.value })}
              />
            </label>
            <div className="exercise-filter-grid" aria-label="Filtros de ejercicios">
              <ExerciseFilterSelect
                label="Músculo"
                value={exerciseFilters.muscle}
                options={filterOptions.muscles}
                onChange={(muscle) => updateExerciseFilter({ muscle })}
              />
              <ExerciseFilterSelect
                label="Equipo"
                value={exerciseFilters.equipment}
                options={filterOptions.equipment}
                onChange={(equipment) => updateExerciseFilter({ equipment })}
              />
              <ExerciseFilterSelect
                label="Tipo"
                value={exerciseFilters.tag}
                options={filterOptions.tags}
                onChange={(tag) => updateExerciseFilter({ tag })}
              />
            </div>
            <div className="exercise-filter-summary">
              <span>
                {filteredExercises.length} de {exerciseLibrary.length} ejercicios
                {activeFilterCount > 0 ? ` · ${activeFilterCount} filtros` : ""}
              </span>
              {hasActiveFilters ? (
                <button className="quiet-button" type="button" onClick={clearExerciseFilters}>
                  <RotateCcw size={13} />
                  Limpiar
                </button>
              ) : null}
            </div>

            {isLibraryLoading ? (
              <BuilderEmptyState
                title="Cargando ejercicios"
                body="Preparando la biblioteca local."
              />
            ) : filteredExercises.length > 0 ? (
              <div className="exercise-library-list">
                {filteredExercises.map((exercise) => (
                  <div
                    className="exercise-library-row"
                    data-active={exercise.id === guideExercise?.id}
                    key={exercise.id}
                  >
                    <button
                      type="button"
                      className="library-main-button"
                      onClick={() => setSelectedExerciseId(exercise.id)}
                    >
                      <strong>{exercise.name}</strong>
                      <span>{formatExerciseEquipmentDetail(exercise)}</span>
                      <small>
                        {[exercise.primaryMuscles[0], exercise.tags[0]].filter(Boolean).join(" · ")}
                      </small>
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Agregar ${exercise.name}`}
                      onClick={() => addExercise(exercise)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <BuilderEmptyState
                title="Sin resultados"
                body="Ajusta la búsqueda o limpia los filtros activos."
              />
            )}

            <ExerciseGuidePanel exercise={guideExercise} />
          </aside>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="dialog-actions builder-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button routine"
            type="button"
            onClick={saveBuilder}
            disabled={isSaving}
          >
            <Save size={16} />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="exercise-filter-field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Filtrar por ${label.toLocaleLowerCase("es-MX")}`}
      >
        <option value={ALL_EXERCISE_FILTER_VALUE}>Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RoutineExerciseEditor({
  routineExercise,
  exercise,
  canMoveUp,
  canMoveDown,
  onSelectGuide,
  onMove,
  onRemove,
  onUpdate,
}: {
  routineExercise: RoutineExercise;
  exercise: Exercise | undefined;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelectGuide: () => void;
  onMove: (routineExerciseId: string, direction: -1 | 1) => void;
  onRemove: (routineExerciseId: string) => void;
  onUpdate: (routineExerciseId: string, updates: Partial<RoutineExercise>) => void;
}) {
  const exerciseType = exercise?.type ?? "reps";
  const weightRelevant = exercise?.weightRelevant !== false;
  const targetText = (() => {
    const sets = routineExercise.targetSets;
    const rMin = routineExercise.targetRepsMin;
    const rMax = routineExercise.targetRepsMax;
    const rangeStr = rMin === rMax ? `${rMin}` : `${rMin}-${rMax}`;
    const weightSuffix = (weightRelevant && routineExercise.targetWeightKg !== null && routineExercise.targetWeightKg !== undefined)
      ? ` · ${routineExercise.targetWeightKg} kg`
      : "";

    if (exerciseType === "duration") {
      return `${sets} series · ${rangeStr} seg${weightSuffix}`;
    }
    if (exerciseType === "cardio") {
      return `${sets} series · ${rangeStr} min`;
    }
    return `${sets} series · ${rangeStr} reps · RIR ${routineExercise.targetRir ?? "libre"}${weightSuffix}`;
  })();

  return (
    <article className="builder-exercise-row">
      <div className="builder-exercise-title">
        <button type="button" onClick={onSelectGuide}>
          <strong>{exercise?.name ?? "Ejercicio guardado"}</strong>
          <span>{targetText}</span>
        </button>
        <div className="builder-row-actions">
          <button
            className="icon-button"
            type="button"
            aria-label={`Subir ${exercise?.name ?? "ejercicio"}`}
            disabled={!canMoveUp}
            onClick={() => onMove(routineExercise.id, -1)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`Bajar ${exercise?.name ?? "ejercicio"}`}
            disabled={!canMoveDown}
            onClick={() => onMove(routineExercise.id, 1)}
          >
            <ArrowDown size={16} />
          </button>
          <button
            className="icon-button danger"
            type="button"
            aria-label={`Quitar ${exercise?.name ?? "ejercicio"}`}
            onClick={() => onRemove(routineExercise.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="builder-target-grid">
        <NumberField
          label="Series"
          value={routineExercise.targetSets}
          min={1}
          onChange={(targetSets) =>
            onUpdate(routineExercise.id, { targetSets: targetSets ?? 1 })
          }
        />
        {exerciseType === "duration" ? (
          <>
            <NumberField
              label="Seg. mín."
              value={routineExercise.targetRepsMin}
              min={1}
              onChange={(targetRepsMin) =>
                onUpdate(routineExercise.id, { targetRepsMin: targetRepsMin ?? 1 })
              }
            />
            <NumberField
              label="Seg. máx."
              value={routineExercise.targetRepsMax}
              min={1}
              onChange={(targetRepsMax) =>
                onUpdate(routineExercise.id, { targetRepsMax: targetRepsMax ?? 1 })
              }
            />
            {weightRelevant && (
              <NumberField
                label="Peso (kg)"
                value={routineExercise.targetWeightKg ?? null}
                min={0}
                allowEmpty
                onChange={(targetWeightKg) =>
                  onUpdate(routineExercise.id, { targetWeightKg })
                }
              />
            )}
          </>
        ) : exerciseType === "cardio" ? (
          <>
            <NumberField
              label="Min. mín."
              value={routineExercise.targetRepsMin}
              min={1}
              onChange={(targetRepsMin) =>
                onUpdate(routineExercise.id, { targetRepsMin: targetRepsMin ?? 1 })
              }
            />
            <NumberField
              label="Min. máx."
              value={routineExercise.targetRepsMax}
              min={1}
              onChange={(targetRepsMax) =>
                onUpdate(routineExercise.id, { targetRepsMax: targetRepsMax ?? 1 })
              }
            />
          </>
        ) : (
          <>
            <NumberField
              label="Reps mín."
              value={routineExercise.targetRepsMin}
              min={1}
              onChange={(targetRepsMin) =>
                onUpdate(routineExercise.id, { targetRepsMin: targetRepsMin ?? 1 })
              }
            />
            <NumberField
              label="Reps máx."
              value={routineExercise.targetRepsMax}
              min={1}
              onChange={(targetRepsMax) =>
                onUpdate(routineExercise.id, { targetRepsMax: targetRepsMax ?? 1 })
              }
            />
            <NumberField
              label="RIR"
              value={routineExercise.targetRir}
              min={0}
              allowEmpty
              onChange={(targetRir) => onUpdate(routineExercise.id, { targetRir })}
            />
            {weightRelevant && (
              <NumberField
                label="Peso (kg)"
                value={routineExercise.targetWeightKg ?? null}
                min={0}
                allowEmpty
                onChange={(targetWeightKg) =>
                  onUpdate(routineExercise.id, { targetWeightKg })
                }
              />
            )}
          </>
        )}
        <NumberField
          label="Descanso"
          value={routineExercise.restSeconds}
          min={0}
          onChange={(restSeconds) =>
            onUpdate(routineExercise.id, { restSeconds: restSeconds ?? 0 })
          }
        />
        <label className="builder-notes-field">
          <span>Notas</span>
          <input
            value={routineExercise.notes}
            placeholder="Tempo, agarre, ajustes..."
            onChange={(event) =>
              onUpdate(routineExercise.id, {
                notes: event.target.value,
              })
            }
          />
        </label>
      </div>
    </article>
  );
}

function NumberField({
  label,
  value,
  min,
  allowEmpty = false,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  allowEmpty?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="builder-number-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={value ?? ""}
        onChange={(event) => {
          if (allowEmpty && event.target.value === "") {
            onChange(null);
            return;
          }

          const parsedValue = Number(event.target.value);
          onChange(Number.isFinite(parsedValue) ? Math.max(min, parsedValue) : min);
        }}
      />
    </label>
  );
}

function ExerciseGuidePanel({ exercise }: { exercise: Exercise | null }) {
  if (!exercise) {
    return (
      <div className="builder-guide">
        <p className="panel-label">Guía</p>
        <p className="muted">Selecciona un ejercicio para ver indicaciones rápidas.</p>
      </div>
    );
  }

  return (
    <div className="builder-guide">
      <p className="panel-label">Guía</p>
      <h4>{exercise.name}</h4>
      <p className="builder-muscle-copy">
        {exercise.primaryMuscles.join(", ")}
        {exercise.secondaryMuscles.length > 0
          ? ` · ${exercise.secondaryMuscles.join(", ")}`
          : ""}
      </p>
      <div className="builder-equipment-detail">
        <span>Estación</span>
        <strong>{formatExerciseEquipmentDetail(exercise)}</strong>
      </div>
      <ExerciseVisualPanel exercise={exercise} compact />
      <GuideList title="Preparación" items={exercise.guide.setup} />
      <GuideList title="Técnica" items={exercise.guide.technique} />
      <GuideList title="Errores comunes" items={exercise.guide.commonMistakes} />
    </div>
  );
}

function GuideList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="builder-guide-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function BuilderEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="builder-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
