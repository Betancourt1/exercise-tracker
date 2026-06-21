import { useEffect, useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { listSeededAvailableExercises } from "../../data";
import type { Exercise } from "../../domain";

const RECENT_EXERCISE_IDS_KEY = "recent-exercise-ids";
const MAX_RECENT = 8;

type ExercisePickerSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  recentExerciseIds?: string[];
};

export function ExercisePickerSheet({
  isOpen,
  onClose,
  onSelect,
  recentExerciseIds = [],
}: ExercisePickerSheetProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("Todo Equipamiento");
  const [muscleFilter, setMuscleFilter] = useState("Todos Músculos");
  const [isLoading, setIsLoading] = useState(true);

  // Stored recents
  const [storedRecentIds, setStoredRecentIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_EXERCISE_IDS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const allRecentIds = useMemo(
    () => Array.from(new Set([...recentExerciseIds, ...storedRecentIds])),
    [recentExerciseIds, storedRecentIds],
  );

  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    listSeededAvailableExercises()
      .then((list) => {
        if (isCurrent) {
          setExercises(list);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [isOpen]);

  const equipmentOptions = useMemo(() => {
    const all = exercises.flatMap((e) => e.equipment);
    return ["Todo Equipamiento", ...Array.from(new Set(all)).sort()];
  }, [exercises]);

  const muscleOptions = useMemo(() => {
    const all = exercises.flatMap((e) => e.primaryMuscles);
    return ["Todos Músculos", ...Array.from(new Set(all)).sort()];
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesQuery =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
        e.equipment.some((eq) => eq.toLowerCase().includes(q));

      const matchesEquipment =
        equipmentFilter === "Todo Equipamiento" ||
        e.equipment.includes(equipmentFilter);

      const matchesMuscle =
        muscleFilter === "Todos Músculos" ||
        e.primaryMuscles.includes(muscleFilter) ||
        e.secondaryMuscles.includes(muscleFilter);

      return matchesQuery && matchesEquipment && matchesMuscle;
    });
  }, [exercises, query, equipmentFilter, muscleFilter]);

  const recentExercises = useMemo(
    () =>
      allRecentIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter((e): e is Exercise => e != null),
    [allRecentIds, exercises],
  );

  const showRecentSection =
    recentExercises.length > 0 && !query.trim() && equipmentFilter === "Todo Equipamiento" && muscleFilter === "Todos Músculos";

  function handleSelect(exercise: Exercise) {
    // Persist to recents
    const next = Array.from(new Set([exercise.id, ...storedRecentIds])).slice(0, MAX_RECENT);
    setStoredRecentIds(next);
    try {
      localStorage.setItem(RECENT_EXERCISE_IDS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    onSelect(exercise);
  }

  if (!isOpen) return null;

  return (
    <div className="exercise-picker-sheet">
      {/* Header */}
      <div className="picker-header">
        <button className="picker-header-action" type="button" onClick={onClose}>
          Cancelar
        </button>
        <span className="picker-header-title">Agregar Ejercicio</span>
        <button className="picker-header-action right" type="button" onClick={onClose}>
          Crear
        </button>
      </div>

      {/* Search */}
      <div className="picker-search-wrap">
        <label className="search-box">
          <span style={{ color: "var(--muted)", fontSize: "1rem" }}>🔍</span>
          <input
            placeholder="Buscar ejercicio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}>
              <X size={14} style={{ color: "var(--muted)" }} />
            </button>
          )}
        </label>
      </div>

      {/* Filters */}
      <div className="picker-filters">
        {equipmentOptions.slice(0, 6).map((opt) => (
          <button
            key={opt}
            type="button"
            className={`picker-filter-pill${equipmentFilter === opt ? " active" : ""}`}
            onClick={() => setEquipmentFilter(opt)}
          >
            {opt}
          </button>
        ))}
        <div style={{ width: 1, height: 28, background: "var(--border)" }} />
        {muscleOptions.slice(0, 6).map((opt) => (
          <button
            key={opt}
            type="button"
            className={`picker-filter-pill${muscleFilter === opt ? " active" : ""}`}
            onClick={() => setMuscleFilter(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="picker-body">
        {isLoading ? (
          <div className="empty-state">
            <strong>Cargando ejercicios...</strong>
          </div>
        ) : (
          <>
            {/* Recent exercises */}
            {showRecentSection && (
              <>
                <div className="picker-section-label">Recientes</div>
                {recentExercises.map((exercise) => (
                  <ExercisePickerRow
                    key={exercise.id}
                    exercise={exercise}
                    onSelect={() => handleSelect(exercise)}
                  />
                ))}
              </>
            )}

            {/* All / filtered exercises */}
            <div className="picker-section-label">
              {query ? `Resultados (${filteredExercises.length})` : `Todos los ejercicios (${filteredExercises.length})`}
            </div>
            {filteredExercises.length === 0 ? (
              <div className="empty-state">
                <strong>Sin resultados</strong>
                <p>Ajusta la búsqueda o los filtros.</p>
              </div>
            ) : (
              filteredExercises.map((exercise) => (
                <ExercisePickerRow
                  key={exercise.id}
                  exercise={exercise}
                  onSelect={() => handleSelect(exercise)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExercisePickerRow({
  exercise,
  onSelect,
}: {
  exercise: Exercise;
  onSelect: () => void;
}) {
  const initials = exercise.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <button className="picker-exercise-row" type="button" onClick={onSelect}>
      <div className="exercise-avatar" style={{ flexShrink: 0 }}>
        {initials}
      </div>
      <div className="picker-exercise-info">
        <span className="picker-exercise-name">{exercise.name}</span>
        <span className="picker-exercise-muscle">
          {exercise.primaryMuscles.slice(0, 2).join(", ")}
          {exercise.equipment.length > 0 ? ` · ${exercise.equipment[0]}` : ""}
        </span>
      </div>
      <ChevronRight size={16} className="picker-exercise-arrow" />
    </button>
  );
}
