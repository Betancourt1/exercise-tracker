import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  Download,
  Dumbbell,
  Library,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { ProgressPage } from "./features/progress/ProgressPage";
import {
  ALL_EXERCISE_FILTER_VALUE,
  filterExerciseLibrary,
  getExerciseFilterOptions,
  hasActiveExerciseFilters,
  type ExerciseLibraryFilters,
} from "./features/routines/exerciseLibraryFilters";
import { RoutinesPage } from "./features/routines/RoutinesPage";
import { loadHighestPriorityActiveRoutine } from "./features/routines/routineQueries";
import type { RoutineSummary } from "./features/routines/types";
import { WorkoutPage } from "./features/workout/WorkoutPage";
import type { WorkoutStartRequest } from "./features/workout/types";
import {
  exportDatabaseJson,
  getLatestInProgressWorkoutDraft,
  listSeededAvailableExercises,
  replaceDatabaseFromExportWithBackup,
  stringifyDatabaseExport,
} from "./data";
import type { DatabaseExport } from "./data";
import { formatExerciseEquipmentDetail, type Exercise } from "./domain";

type PageId = "today" | "routines" | "exercises" | "progress" | "settings" | "workout";

type NavItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
};

type SettingsStatus = {
  tone: "success" | "error" | "neutral";
  message: string;
};

const ACTIVE_PAGE_STORAGE_KEY = "mi-rutina-active-page";

const navItems: NavItem[] = [
  { id: "today", label: "Hoy", icon: CalendarDays },
  { id: "routines", label: "Rutinas", icon: Dumbbell },
  { id: "exercises", label: "Ejercicios", icon: Library },
  { id: "progress", label: "Progreso", icon: BarChart3 },
  { id: "settings", label: "Ajustes", icon: Settings },
];

const contextByPage: Record<
  PageId,
  {
    title: string;
    eyebrow: string;
    body: string;
    bullets: string[];
  }
> = {
  today: {
    title: "Siguiente entrenamiento",
    eyebrow: "Contexto",
    body: "Cuando exista una rutina activa, aquí aparecerá el bloque recomendado para empezar la sesión.",
    bullets: ["Rutina prioritaria", "Última sesión", "Recordatorio técnico"],
  },
  routines: {
    title: "Guía de constructor",
    eyebrow: "Rutinas",
    body: "Al agregar ejercicios, este panel mostrará técnica breve, errores comunes y descansos sugeridos.",
    bullets: ["Nombre y objetivo", "Días activos", "Ejercicios por bloque"],
  },
  exercises: {
    title: "Guía de ejercicio",
    eyebrow: "Biblioteca",
    body: "Selecciona un movimiento para ver indicaciones compactas sin salir del flujo de elección.",
    bullets: ["Equipo exacto", "Técnica", "Errores comunes"],
  },
  progress: {
    title: "Lectura de progreso",
    eyebrow: "Analíticas",
    body: "Las métricas se calcularán desde sesiones guardadas y mostrarán fórmulas simples.",
    bullets: ["Volumen", "Adherencia", "PRs y tendencia"],
  },
  settings: {
    title: "Datos locales",
    eyebrow: "Respaldo",
    body: "La exportación e importación serán el escape para recuperar rutinas e historial local.",
    bullets: ["Unidades", "Exportar", "Importar"],
  },
  workout: {
    title: "Guía durante la sesión",
    eyebrow: "Entrenar",
    body: "La sesión activa guarda borradores locales y conserva snapshots de rutina, ejercicio y objetivos.",
    bullets: ["Set actual", "Descanso", "Técnica compacta"],
  },
};

function App() {
  const [activePage, setActivePage] = useState<PageId>(getStoredActivePage);
  const [todayRoutine, setTodayRoutine] = useState<RoutineSummary | null>(null);
  const [workoutStartRequest, setWorkoutStartRequest] =
    useState<WorkoutStartRequest | null>(null);
  const [hasInProgressWorkout, setHasInProgressWorkout] = useState(false);
  const activeNavItem = useMemo(
    () =>
      activePage === "workout"
        ? ({ id: "workout", label: "Entrenar", icon: Dumbbell } satisfies NavItem)
        : navItems.find((item) => item.id === activePage) ?? navItems[0],
    [activePage],
  );
  const refreshTodayRoutine = useCallback(async () => {
    setTodayRoutine(await loadHighestPriorityActiveRoutine());
  }, []);
  const refreshInProgressWorkout = useCallback(async () => {
    setHasInProgressWorkout(Boolean(await getLatestInProgressWorkoutDraft()));
  }, []);
  const refreshAppData = useCallback(async () => {
    await Promise.all([refreshTodayRoutine(), refreshInProgressWorkout()]);
  }, [refreshInProgressWorkout, refreshTodayRoutine]);

  useEffect(() => {
    void refreshTodayRoutine();
  }, [refreshTodayRoutine]);

  useEffect(() => {
    void refreshInProgressWorkout();
  }, [refreshInProgressWorkout]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, activePage);
  }, [activePage]);

  function startWorkout(summary: RoutineSummary) {
    setWorkoutStartRequest({
      id: Date.now(),
      summary,
    });
    setActivePage("workout");
  }

  function continueWorkout() {
    setWorkoutStartRequest(null);
    setActivePage("workout");
  }

  function exitWorkout(page: "today" | "routines") {
    setWorkoutStartRequest(null);
    setActivePage(page);
    void refreshTodayRoutine();
    void refreshInProgressWorkout();
  }

  return (
    <div className="app-shell">
      <DesktopSidebar activePage={activePage} onNavigate={setActivePage} />

      <main className="workspace" aria-labelledby="page-title">
        <MobileHeader activeItem={activeNavItem} />
        <Page
          activePage={activePage}
          todayRoutine={todayRoutine}
          hasInProgressWorkout={hasInProgressWorkout}
          onNavigate={setActivePage}
          onRoutinesChanged={refreshTodayRoutine}
          onStartWorkout={startWorkout}
          onContinueWorkout={continueWorkout}
          workoutStartRequest={workoutStartRequest}
          onWorkoutExit={exitWorkout}
          onWorkoutChanged={refreshInProgressWorkout}
          onDataImported={refreshAppData}
        />
        <MobileContext activePage={activePage} />
      </main>

      <ContextPanel activePage={activePage} />
      <MobileNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}

function DesktopSidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Dumbbell size={17} strokeWidth={2.4} />
        </span>
        <span>Mi Rutina</span>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="quiet-button" type="button">
          Ayuda
        </button>
      </div>
    </aside>
  );
}

function NavButton({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: (page: PageId) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className="nav-button"
      data-active={isActive}
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon size={17} strokeWidth={2} />
      <span>{item.label}</span>
    </button>
  );
}

function MobileHeader({ activeItem }: { activeItem: NavItem }) {
  const Icon = activeItem.icon;

  return (
    <header className="mobile-header">
      <div className="brand compact">
        <span className="brand-mark" aria-hidden="true">
          <Dumbbell size={16} strokeWidth={2.4} />
        </span>
        <span>Mi Rutina</span>
      </div>
      <div className="mobile-section">
        <Icon size={17} strokeWidth={2} />
        <span>{activeItem.label}</span>
      </div>
    </header>
  );
}

function getStoredActivePage(): PageId {
  const storedPage = window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
  return isPageId(storedPage) ? storedPage : "today";
}

function isPageId(value: string | null): value is PageId {
  return (
    value === "today" ||
    value === "routines" ||
    value === "exercises" ||
    value === "progress" ||
    value === "settings" ||
    value === "workout"
  );
}

function Page({
  activePage,
  todayRoutine,
  hasInProgressWorkout,
  onNavigate,
  onRoutinesChanged,
  onStartWorkout,
  onContinueWorkout,
  workoutStartRequest,
  onWorkoutExit,
  onWorkoutChanged,
  onDataImported,
}: {
  activePage: PageId;
  todayRoutine: RoutineSummary | null;
  hasInProgressWorkout: boolean;
  onNavigate: (page: PageId) => void;
  onRoutinesChanged: () => void;
  onStartWorkout: (summary: RoutineSummary) => void;
  onContinueWorkout: () => void;
  workoutStartRequest: WorkoutStartRequest | null;
  onWorkoutExit: (page: "today" | "routines") => void;
  onWorkoutChanged: () => void;
  onDataImported: () => Promise<void>;
}) {
  switch (activePage) {
    case "routines":
      return (
        <RoutinesPage
          onRoutinesChanged={onRoutinesChanged}
          onStartWorkout={onStartWorkout}
        />
      );
    case "workout":
      return (
        <WorkoutPage
          startRequest={workoutStartRequest}
          onExit={onWorkoutExit}
          onWorkoutChanged={() => {
            onRoutinesChanged();
            onWorkoutChanged();
          }}
        />
      );
    case "exercises":
      return <ExercisesPage />;
    case "progress":
      return <ProgressPage onTrain={() => onNavigate("today")} />;
    case "settings":
      return <SettingsPage onDataImported={onDataImported} />;
    case "today":
    default:
      return (
        <TodayPage
          todayRoutine={todayRoutine}
          hasInProgressWorkout={hasInProgressWorkout}
          onNavigate={onNavigate}
          onStartWorkout={onStartWorkout}
          onContinueWorkout={onContinueWorkout}
        />
      );
  }
}

function TodayPage({
  todayRoutine,
  hasInProgressWorkout,
  onNavigate,
  onStartWorkout,
  onContinueWorkout,
}: {
  todayRoutine: RoutineSummary | null;
  hasInProgressWorkout: boolean;
  onNavigate: (page: PageId) => void;
  onStartWorkout: (summary: RoutineSummary) => void;
  onContinueWorkout: () => void;
}) {
  const activeSummary = todayRoutine;
  const canTrain = Boolean(activeSummary && activeSummary.exerciseCount > 0);
  const primaryLabel = hasInProgressWorkout
    ? "Continuar"
    : canTrain
      ? "Entrenar"
      : activeSummary
        ? "Editar rutina"
        : "Crear rutina";

  return (
    <section className="page-section">
      <PageTitle
        kicker="Entrenamiento"
        title="Hoy"
        action={
          <button
            className={`primary-button ${
              hasInProgressWorkout || canTrain ? "training" : "routine"
            }`}
            type="button"
            onClick={() => {
              if (hasInProgressWorkout) {
                onContinueWorkout();
                return;
              }

              if (canTrain && activeSummary) {
                onStartWorkout(activeSummary);
                return;
              }

              onNavigate("routines");
            }}
          >
            {hasInProgressWorkout || canTrain ? <Play size={16} /> : <Plus size={16} />}
            {primaryLabel}
          </button>
        }
      />

      <div className="today-grid">
        <article className="panel next-session">
          <div>
            <p className="panel-label">Próxima sesión</p>
            <h2>{activeSummary ? activeSummary.routine.name : "No hay rutina activa"}</h2>
            <p className="muted">
              {activeSummary
                ? `${activeSummary.routine.goal || "General"} · ${activeSummary.days.length} ${
                    activeSummary.days.length === 1 ? "día activo" : "días activos"
                  } · ${activeSummary.exerciseCount} ejercicios configurados.`
                : "Crea una rutina para ver aquí el siguiente bloque y empezar a entrenar."}
            </p>
          </div>
          <div className="today-session-meta" aria-label="Resumen de la próxima sesión">
            <span>
              <strong>{activeSummary?.days.length ?? 0}</strong>
              {activeSummary?.days.length === 1 ? "día" : "días"}
            </span>
            <span>
              <strong>{activeSummary?.exerciseCount ?? 0}</strong>
              ejercicios
            </span>
            <span>
              <strong>{hasInProgressWorkout ? "Sí" : "No"}</strong>
              sesión abierta
            </span>
          </div>
          <div className="button-row">
            <button
              className={activeSummary ? "secondary-button" : "primary-button routine"}
              type="button"
              onClick={() => onNavigate("routines")}
            >
              <Plus size={16} />
              {activeSummary ? "Ver rutina" : "Crear rutina"}
            </button>
          </div>
        </article>

        <article className="panel compact-panel">
          <p className="panel-label">Prioridad</p>
          {activeSummary ? (
            <div className="priority-summary">
              <strong>{activeSummary.routine.name}</strong>
              <span>{activeSummary.routine.goal || "General"}</span>
              <span>{activeSummary.days.map((day) => day.label).join(", ")}</span>
            </div>
          ) : (
            <EmptyRows
              rows={3}
              labels={["Rutina prioritaria", "Última sesión", "Próximo día"]}
            />
          )}
        </article>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-label">Rutinas para hoy</p>
            <h2>{activeSummary ? "Rutina activa lista" : "Sin pendientes"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Actualizar">
            <RotateCcw size={16} />
          </button>
        </div>
        {activeSummary ? (
          <div className="routine-today-row">
            <strong>{activeSummary.routine.name}</strong>
            <span>{activeSummary.days.length} días activos</span>
            <span>
              {activeSummary.exerciseCount > 0
                ? "Lista para entrenar"
                : "Agrega ejercicios para entrenar"}
            </span>
          </div>
        ) : (
          <EmptyState
            title="No hay sesiones planificadas"
            body="Las rutinas creadas aparecerán aquí según su orden y próxima sesión."
          />
        )}
      </article>
    </section>
  );
}

function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [exerciseFilters, setExerciseFilters] = useState<ExerciseLibraryFilters>({
    query: "",
    muscle: ALL_EXERCISE_FILTER_VALUE,
    equipment: ALL_EXERCISE_FILTER_VALUE,
    tag: ALL_EXERCISE_FILTER_VALUE,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadExercises() {
      setIsLoading(true);
      setError(null);

      try {
        const seededExercises = await listSeededAvailableExercises();
        if (!isCurrent) {
          return;
        }

        setExercises(seededExercises);
        setSelectedExerciseId((currentId) => currentId ?? seededExercises[0]?.id ?? null);
      } catch {
        if (isCurrent) {
          setError("No se pudo cargar la biblioteca local de ejercicios.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadExercises();

    return () => {
      isCurrent = false;
    };
  }, []);

  const filterOptions = useMemo(() => getExerciseFilterOptions(exercises), [exercises]);
  const filteredExercises = useMemo(() => {
    return filterExerciseLibrary(exercises, exerciseFilters);
  }, [exercises, exerciseFilters]);
  const activeFilterCount = [
    exerciseFilters.query.trim(),
    exerciseFilters.muscle !== ALL_EXERCISE_FILTER_VALUE ? exerciseFilters.muscle : "",
    exerciseFilters.equipment !== ALL_EXERCISE_FILTER_VALUE
      ? exerciseFilters.equipment
      : "",
    exerciseFilters.tag !== ALL_EXERCISE_FILTER_VALUE ? exerciseFilters.tag : "",
  ].filter(Boolean).length;
  const hasActiveFilters = hasActiveExerciseFilters(exerciseFilters);
  const selectedExercise =
    filteredExercises.find((exercise) => exercise.id === selectedExerciseId) ??
    filteredExercises[0] ??
    null;

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

  return (
    <section className="page-section">
      <PageTitle kicker="Ejercicios" title="Biblioteca de ejercicios" />

      <div className="toolbar exercise-browser-toolbar">
        <div className="exercise-browser-controls">
          <label className="search-box">
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
        </div>
        <div className="exercise-browser-summary">
          <span className="toolbar-count">
            {filteredExercises.length} de {exercises.length} ejercicios
            {activeFilterCount > 0 ? ` · ${activeFilterCount} filtros` : ""}
          </span>
          {hasActiveFilters ? (
            <button className="quiet-button" type="button" onClick={clearExerciseFilters}>
              <RotateCcw size={13} />
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="split-grid">
        <article className="panel exercise-library-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Movimientos</p>
              <h2>{isLoading ? "Cargando ejercicios" : "Biblioteca local"}</h2>
            </div>
          </div>
          {isLoading ? (
            <EmptyRows rows={4} labels={["Nombre", "Estación"]} />
          ) : filteredExercises.length > 0 ? (
            <>
              <div className="exercise-browser-table-head" aria-hidden="true">
                <span>Ejercicio</span>
                <span>Estación</span>
              </div>
              <div className="exercise-browser-list">
                {filteredExercises.map((exercise) => {
                  const equipmentDetail = formatExerciseEquipmentDetail(exercise);
                  const exerciseMeta = [
                    exercise.primaryMuscles.join(", "),
                    exercise.tags.slice(0, 2).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <button
                      className="exercise-browser-row"
                      data-active={exercise.id === selectedExercise?.id}
                      type="button"
                      key={exercise.id}
                      onClick={() => setSelectedExerciseId(exercise.id)}
                    >
                      <span className="exercise-name-cell">
                        <strong>{exercise.name}</strong>
                        <small>{exerciseMeta}</small>
                      </span>
                      <span className="exercise-station-text" title={equipmentDetail}>
                        {equipmentDetail}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              title="Sin resultados"
              body="Ajusta la búsqueda o limpia los filtros activos."
            />
          )}
        </article>
        <ExerciseGuideCard exercise={selectedExercise} />
      </div>
    </section>
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

function ExerciseGuideCard({ exercise }: { exercise: Exercise | null }) {
  if (!exercise) {
    return (
      <article className="panel guide-card">
        <p className="panel-label">Guía</p>
        <h2>Elige un ejercicio</h2>
        <p className="muted">Selecciona un movimiento para ver indicaciones breves.</p>
        <GuideList />
      </article>
    );
  }

  return (
    <article className="panel guide-card">
      <p className="panel-label">Guía</p>
      <h2>{exercise.name}</h2>
      <p className="muted">
        {exercise.primaryMuscles.join(", ")}
        {exercise.secondaryMuscles.length > 0
          ? ` · ${exercise.secondaryMuscles.join(", ")}`
          : ""}
      </p>
      <EquipmentDetailCallout exercise={exercise} />
      <GuideBlock title="Preparación" items={exercise.guide.setup} />
      <GuideBlock title="Técnica" items={exercise.guide.technique} />
      <GuideBlock title="Errores comunes" items={exercise.guide.commonMistakes} />
    </article>
  );
}

function EquipmentDetailCallout({ exercise }: { exercise: Exercise }) {
  return (
    <div className="equipment-detail-callout">
      <span>Busca en el gym</span>
      <strong>{formatExerciseEquipmentDetail(exercise)}</strong>
    </div>
  );
}

function GuideBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="exercise-guide-block">
      <strong>{title}</strong>
      <GuideList items={items} />
    </div>
  );
}

function SettingsPage({ onDataImported }: { onDataImported: () => Promise<void> }) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [latestBackup, setLatestBackup] = useState<DatabaseExport | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function handleExport() {
    setIsWorking(true);
    setStatus({ tone: "neutral", message: "Preparando respaldo local..." });

    try {
      const exportPayload = await exportDatabaseJson();
      downloadDatabaseExport(exportPayload, "mi-rutina-respaldo");
      setStatus({
        tone: "success",
        message: "Respaldo exportado. Guarda este JSON en un lugar seguro.",
      });
    } catch {
      setStatus({
        tone: "error",
        message: "No se pudo exportar el respaldo local.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  function openImportPicker() {
    if (!importInputRef.current) {
      return;
    }

    importInputRef.current.value = "";
    importInputRef.current.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Importar este respaldo reemplazará todos los datos locales actuales. Se creará un respaldo del estado actual antes de reemplazar. ¿Continuar?",
    );
    if (!confirmed) {
      input.value = "";
      return;
    }

    setIsWorking(true);
    setLatestBackup(null);
    setStatus({ tone: "neutral", message: "Validando respaldo e importando datos..." });

    try {
      const result = await replaceDatabaseFromExportWithBackup(await file.text());
      await onDataImported();
      setLatestBackup(result.backup);
      setStatus({
        tone: "success",
        message:
          "Importación completa. La app ya usa los datos importados y se creó un respaldo del estado anterior.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: `No se pudo importar: ${getImportErrorMessage(error)}`,
      });
    } finally {
      setIsWorking(false);
      input.value = "";
    }
  }

  return (
    <section className="page-section">
      <PageTitle kicker="Ajustes" title="Preferencias locales" />

      <article className="panel settings-list">
        <div className="settings-intro">
          <strong>Respaldo y recuperación</strong>
          <p>
            Tus rutinas, sesiones e historial viven en este navegador. Exporta un JSON
            antes de cambiar de equipo o importar otro respaldo.
          </p>
        </div>

        <SettingsRow title="Unidades" detail="kg por defecto" />
        <SettingsRow
          title="Exportar datos"
          detail="Descarga rutinas, sesiones, ejercicios y ajustes locales."
          action={
            <button
              className="secondary-button"
              type="button"
              onClick={handleExport}
              disabled={isWorking}
            >
              <Download size={16} />
              Exportar datos
            </button>
          }
        />
        <SettingsRow
          title="Importar respaldo"
          detail="Reemplaza los datos locales con un archivo JSON validado."
          action={
            <div className="settings-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={openImportPicker}
                disabled={isWorking}
              >
                <Upload size={16} />
                Importar JSON
              </button>
              {latestBackup ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    downloadDatabaseExport(
                      latestBackup,
                      "mi-rutina-respaldo-antes-importar",
                    )
                  }
                >
                  <Download size={16} />
                  Respaldo anterior
                </button>
              ) : null}
            </div>
          }
        />
        <SettingsRow title="Acciones destructivas" detail="Confirmación obligatoria" danger />
        <input
          ref={importInputRef}
          className="file-input-hidden"
          type="file"
          accept=".json,application/json"
          aria-label="Importar respaldo JSON"
          onChange={handleImportFile}
        />
        {status ? (
          <p className="settings-status" data-tone={status.tone} role="status">
            {status.message}
          </p>
        ) : null}
      </article>
    </section>
  );
}

function PageTitle({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <p>{kicker}</p>
        <h1 id="page-title">{title}</h1>
      </div>
      {action}
    </header>
  );
}

function ContextPanel({ activePage }: { activePage: PageId }) {
  const context = contextByPage[activePage];

  return (
    <aside className="context-panel" aria-label="Panel contextual">
      <p className="panel-label">{context.eyebrow}</p>
      <h2>{context.title}</h2>
      <p className="muted">{context.body}</p>
      <GuideList items={context.bullets} />

      <div className="context-note">
        <span className="status-dot" />
        <p>El historial se conservará aunque una rutina cambie o se elimine.</p>
      </div>
    </aside>
  );
}

function MobileContext({ activePage }: { activePage: PageId }) {
  const context = contextByPage[activePage];

  return (
    <article className="mobile-context panel">
      <p className="panel-label">{context.eyebrow}</p>
      <h2>{context.title}</h2>
      <p className="muted">{context.body}</p>
    </article>
  );
}

function MobileNav({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <nav className="mobile-nav" aria-label="Navegación principal">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            data-active={activePage === item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SettingsRow({
  title,
  detail,
  danger,
  action,
}: {
  title: string;
  detail: string;
  danger?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="settings-row" data-danger={danger}>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      {action ?? (danger ? <Trash2 size={16} /> : <span className="row-status">Pendiente</span>)}
    </div>
  );
}

function downloadDatabaseExport(exportPayload: DatabaseExport, filePrefix: string) {
  const json = stringifyDatabaseExport(exportPayload);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filePrefix}-${formatFileDate(exportPayload.exportedAt)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatFileDate(value: string) {
  return value.replace(/[:.]/g, "-");
}

function getImportErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido al leer el respaldo.";
}

function EmptyRows({ rows, labels }: { rows: number; labels: string[] }) {
  return (
    <div className="empty-rows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="empty-row" key={labels[index] ?? index}>
          <span>{labels[index] ?? "Campo"}</span>
          <i />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function GuideList({ items }: { items?: string[] }) {
  const guideItems = items ?? ["Técnica compacta", "Errores comunes", "Recordatorios"];

  return (
    <ul className="guide-list">
      {guideItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default App;
