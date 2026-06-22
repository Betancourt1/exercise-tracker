import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, ChevronDown, ChevronUp, X } from "lucide-react";
import { listCompletedSetLogsForExercise, listCompletedWorkoutSessions } from "../../data";
import type { Exercise, ExerciseType, SetLog, WorkoutSession } from "../../domain";
import { ExerciseVisualPanel } from "../exerciseVisuals";

type DetailTab = "resumen" | "historia" | "indicaciones";
type MetricPill = "peso" | "1rm" | "volumen-serie" | "tiempo" | "distancia" | "repeticiones";

type ExerciseDetailSheetProps = {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToWorkout?: (exercise: Exercise) => void;
};

type SessionSummary = {
  session: WorkoutSession;
  sets: SetLog[];
};

function estimatedOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

export function ExerciseDetailSheet({
  exercise,
  isOpen,
  onClose,
  onAddToWorkout,
}: ExerciseDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("resumen");
  const [activeMetric, setActiveMetric] = useState<MetricPill>("peso");
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showRecords, setShowRecords] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    if (exercise.type === "duration") {
      setActiveMetric("tiempo");
    } else if (exercise.type === "cardio") {
      setActiveMetric("distancia");
    } else {
      setActiveMetric(exercise.weightRelevant === false ? "repeticiones" : "peso");
    }
  }, [exercise]);

  useEffect(() => {
    if (!isOpen || !exercise) return;
    setIsLoadingData(true);
    Promise.all([
      listCompletedSetLogsForExercise(exercise.id),
      listCompletedWorkoutSessions(),
    ])
      .then(([logs, sess]) => {
        setSetLogs(logs);
        setSessions(sess);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        setIsLoadingData(false);
      });
  }, [isOpen, exercise]);

  const completedSets = useMemo(
    () => setLogs.filter((s) => s.completed && s.reps != null),
    [setLogs],
  );

  // PRs
  const bestWeight = useMemo(() => {
    let best: { weight: number; reps: number } | null = null;
    for (const s of completedSets) {
      const w = s.weightKg ?? 0;
      if (best === null || w > best.weight) {
        best = { weight: w, reps: s.reps ?? 0 };
      }
    }
    return best;
  }, [completedSets]);

  const bestDuration = useMemo(() => {
    let max = 0;
    for (const s of completedSets) {
      if (s.reps != null && s.reps > max) {
        max = s.reps;
      }
    }
    return max > 0 ? max : null;
  }, [completedSets]);

  const bestDistance = useMemo(() => {
    let max = 0;
    for (const s of completedSets) {
      const w = s.weightKg ?? 0;
      if (w > max) {
        max = w;
      }
    }
    return max > 0 ? max : null;
  }, [completedSets]);

  const best1RM = useMemo(() => {
    let best = 0;
    for (const s of completedSets) {
      if (s.reps != null) {
        const e1rm = estimatedOneRepMax(s.weightKg ?? 0, s.reps);
        if (e1rm > best) best = e1rm;
      }
    }
    return best > 0 ? best : null;
  }, [completedSets]);

  const bestSetVolume = useMemo(() => {
    let best = 0;
    for (const s of completedSets) {
      if (s.reps != null) {
        const vol = (s.weightKg ?? 0) * s.reps;
        if (vol > best) best = vol;
      }
    }
    return best > 0 ? best : null;
  }, [completedSets]);

  const totalVolume = useMemo(
    () =>
      completedSets.reduce(
        (sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0),
        0,
      ),
    [completedSets],
  );

  const bestReps = useMemo(() => {
    let max = 0;
    for (const s of completedSets) {
      if (s.reps != null && s.reps > max) {
        max = s.reps;
      }
    }
    return max > 0 ? max : null;
  }, [completedSets]);

  // Chart data
  const chartPoints = useMemo(() => {
    const points = [...completedSets]
      .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""))
      .slice(-20)
      .map((s) => {
        let value = 0;
        if (activeMetric === "peso") value = s.weightKg ?? 0;
        else if (activeMetric === "tiempo") value = s.reps ?? 0;
        else if (activeMetric === "distancia") value = s.weightKg ?? 0;
        else if (activeMetric === "repeticiones") value = s.reps ?? 0;
        else if (activeMetric === "1rm") value = estimatedOneRepMax(s.weightKg ?? 0, s.reps ?? 0);
        else if (activeMetric === "volumen-serie") value = (s.weightKg ?? 0) * (s.reps ?? 0);
        return { value, date: s.completedAt ?? "" };
      });
    return points;
  }, [completedSets, activeMetric]);

  const maxChartValue = useMemo(
    () => Math.max(...chartPoints.map((p) => p.value), 1),
    [chartPoints],
  );

  // History: group by session
  const history = useMemo((): SessionSummary[] => {
    const sessionMap = new Map<string, WorkoutSession>();
    for (const sess of sessions) {
      sessionMap.set(sess.id, sess);
    }

    const bySession = new Map<string, SetLog[]>();
    for (const s of setLogs.filter((s) => s.completed)) {
      const list = bySession.get(s.sessionId) ?? [];
      list.push(s);
      bySession.set(s.sessionId, list);
    }

    const result: SessionSummary[] = [];
    for (const [sessionId, sets] of bySession.entries()) {
      const session = sessionMap.get(sessionId);
      if (session) {
        result.push({ session, sets });
      }
    }

    return result.sort(
      (a, b) =>
        new Date(b.session.startedAt).getTime() - new Date(a.session.startedAt).getTime(),
    );
  }, [setLogs, sessions]);

  if (!isOpen || !exercise) return null;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(iso),
    );

  const formatKg = (v: number) =>
    new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(v);

  return (
    <div className="exercise-detail-sheet">
      {/* Header */}
      <div className="detail-header">
        <button className="detail-header-action" type="button" onClick={onClose}>
          <ArrowLeft size={20} />
        </button>
        <span className="detail-header-title">{exercise.name}</span>
        <button className="detail-header-action" type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {(["resumen", "historia", "indicaciones"] as DetailTab[]).map((tab) => (
          <button
            key={tab}
            className={`detail-tab${activeTab === tab ? " active" : ""}`}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "resumen" ? "Resumen" : tab === "historia" ? "Historia" : "Indicaciones"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="detail-body">
        {activeTab === "resumen" && (
          <ResumenTab
            exercise={exercise}
            chartPoints={chartPoints}
            maxChartValue={maxChartValue}
            activeMetric={activeMetric}
            bestWeight={bestWeight}
            bestDuration={bestDuration}
            bestDistance={bestDistance}
            best1RM={best1RM}
            bestSetVolume={bestSetVolume}
            totalVolume={totalVolume}
            bestReps={bestReps}
            hasData={completedSets.length > 0}
            showRecords={showRecords}
            isLoading={isLoadingData}
            onMetricChange={setActiveMetric}
            onToggleRecords={() => setShowRecords((v) => !v)}
            formatKg={formatKg}
          />
        )}
        {activeTab === "historia" && (
          <HistoriaTab
            history={history}
            formatDate={formatDate}
            formatKg={formatKg}
            exerciseType={exercise.type || "reps"}
            weightRelevant={exercise.weightRelevant !== false}
          />
        )}
        {activeTab === "indicaciones" && (
          <IndicacionesTab exercise={exercise} />
        )}
      </div>

      {/* Sticky bottom button */}
      {onAddToWorkout && (
        <div className="detail-sticky-bottom">
          <button
            className="detail-add-btn"
            type="button"
            onClick={() => onAddToWorkout(exercise)}
          >
            Agregar ejercicio
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Resumen ──────────────────────────────────────────────────────────────

function ResumenTab({
  exercise,
  chartPoints,
  maxChartValue,
  activeMetric,
  bestWeight,
  bestDuration,
  bestDistance,
  best1RM,
  bestSetVolume,
  totalVolume,
  bestReps,
  hasData,
  showRecords,
  isLoading,
  onMetricChange,
  onToggleRecords,
  formatKg,
}: {
  exercise: Exercise;
  chartPoints: { value: number; date: string }[];
  maxChartValue: number;
  activeMetric: MetricPill;
  bestWeight: { weight: number; reps: number } | null;
  bestDuration: number | null;
  bestDistance: number | null;
  best1RM: number | null;
  bestSetVolume: number | null;
  totalVolume: number;
  bestReps: number | null;
  hasData: boolean;
  showRecords: boolean;
  isLoading: boolean;
  onMetricChange: (m: MetricPill) => void;
  onToggleRecords: () => void;
  formatKg: (v: number) => string;
}) {
  const exerciseType = exercise.type ?? "reps";
  const isCardio = exerciseType === "cardio";
  const isDuration = exerciseType === "duration";
  const weightRelevant = exercise.weightRelevant !== false;

  return (
    <>
      {/* Visual */}
      <div className="detail-section">
        <ExerciseVisualPanel exercise={exercise} compact />
      </div>

      {/* Muscle info */}
      <div className="detail-section">
        <div className="detail-muscle-info">
          <div>
            <span>Primario: </span>
            <strong>{exercise.primaryMuscles.join(", ") || "—"}</strong>
          </div>
          {exercise.secondaryMuscles.length > 0 && (
            <div>
              <span>Secundario: </span>
              <strong>{exercise.secondaryMuscles.join(", ")}</strong>
            </div>
          )}
        </div>
        {exercise.equipmentDetail && (
          <p style={{ marginTop: 8, fontSize: "0.8125rem", color: "var(--muted)" }}>
            🏋️ {exercise.equipmentDetail}
          </p>
        )}
      </div>

      {/* Metric pills */}
      {hasData && (
        <div className="detail-section">
          {((isCardio) || (isDuration && weightRelevant)) && (
            <div className="detail-metric-pills" style={{ marginBottom: 12 }}>
              {isCardio ? (
                <>
                  <button
                    type="button"
                    className={`detail-metric-pill${activeMetric === "distancia" ? " active" : ""}`}
                    onClick={() => onMetricChange("distancia")}
                  >
                    Distancia
                  </button>
                  <button
                    type="button"
                    className={`detail-metric-pill${activeMetric === "tiempo" ? " active" : ""}`}
                    onClick={() => onMetricChange("tiempo")}
                  >
                    Tiempo
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`detail-metric-pill${activeMetric === "tiempo" ? " active" : ""}`}
                    onClick={() => onMetricChange("tiempo")}
                  >
                    Tiempo
                  </button>
                  <button
                    type="button"
                    className={`detail-metric-pill${activeMetric === "peso" ? " active" : ""}`}
                    onClick={() => onMetricChange("peso")}
                  >
                    Peso
                  </button>
                </>
              )}
            </div>
          )}

          {!isCardio && !isDuration && weightRelevant && (
            <div className="detail-metric-pills" style={{ marginBottom: 12 }}>
              {(["peso", "1rm", "volumen-serie"] as MetricPill[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`detail-metric-pill${activeMetric === m ? " active" : ""}`}
                  onClick={() => onMetricChange(m)}
                >
                  {m === "peso" ? "Mayor Peso" : m === "1rm" ? "One Rep Max" : "Volumen Serie"}
                </button>
              ))}
            </div>
          )}

          {/* Chart */}
          {isLoading ? (
            <div className="detail-chart-empty">
              <BarChart3 size={32} style={{ opacity: 0.3 }} />
              <p>Cargando datos...</p>
            </div>
          ) : chartPoints.length === 0 ? (
            <div className="detail-chart-empty">
              <BarChart3 size={32} style={{ opacity: 0.3 }} />
              <p>No hay datos en este período</p>
            </div>
          ) : (
            <div
              role="img"
              aria-label={`Gráfica de ${activeMetric} para ${exercise.name}`}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 100,
                padding: "8px 0",
              }}
            >
              {chartPoints.map((point, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      background: "var(--accent)",
                      borderRadius: "3px 3px 0 0",
                      opacity: 0.75,
                      height: `${Math.max(8, (point.value / maxChartValue) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRs */}
      <div className="pr-section">
        <div className="pr-section-title">
          <span>🏆</span>
          <span>Records personales</span>
          <button type="button" onClick={onToggleRecords} style={{ marginLeft: "auto", color: "var(--muted)" }}>
            {showRecords ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {(showRecords || true) && (
          <>
            {isCardio && (
              <>
                <div className="pr-row">
                  <span className="pr-row-label">Mejor Distancia</span>
                  <span className="pr-row-value">
                    {bestDistance ? `${formatKg(bestDistance)} km` : "—"}
                  </span>
                </div>
                <div className="pr-row">
                  <span className="pr-row-label">Mejor Tiempo</span>
                  <span className="pr-row-value">
                    {bestDuration ? `${bestDuration} min` : "—"}
                  </span>
                </div>
              </>
            )}
            {isDuration && (
              <>
                <div className="pr-row">
                  <span className="pr-row-label">Mejor Tiempo</span>
                  <span className="pr-row-value">
                    {bestDuration ? `${bestDuration} seg` : "—"}
                  </span>
                </div>
                {weightRelevant && (
                  <div className="pr-row">
                    <span className="pr-row-label">Mayor Peso</span>
                    <span className="pr-row-value">
                      {bestWeight && bestWeight.weight > 0 ? `${formatKg(bestWeight.weight)} kg` : "B.W."}
                    </span>
                  </div>
                )}
              </>
            )}
            {!isCardio && !isDuration && (
              <>
                {weightRelevant ? (
                  <>
                    <div className="pr-row">
                      <span className="pr-row-label">Mayor Peso</span>
                      <span className="pr-row-value">
                        {bestWeight ? `${formatKg(bestWeight.weight)} kg × ${bestWeight.reps}` : "—"}
                      </span>
                    </div>
                    <div className="pr-row">
                      <span className="pr-row-label">Mejor 1RM</span>
                      <span className="pr-row-value">
                        {best1RM ? `${formatKg(best1RM)} kg` : "—"}
                      </span>
                    </div>
                    <div className="pr-row">
                      <span className="pr-row-label">Mejor Volumen (Serie)</span>
                      <span className="pr-row-value">
                        {bestSetVolume ? `${formatKg(bestSetVolume)} kg` : "—"}
                      </span>
                    </div>
                    <div className="pr-row">
                      <span className="pr-row-label">Volumen Total</span>
                      <span className="pr-row-value">
                        {totalVolume > 0 ? `${formatKg(totalVolume)} kg` : "—"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="pr-row">
                    <span className="pr-row-label">Mejor Serie</span>
                    <span className="pr-row-value">
                      {bestReps ? `${bestReps} reps` : "—"}
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Tab: Historia ─────────────────────────────────────────────────────────────

function HistoriaTab({
  history,
  formatDate,
  formatKg,
  exerciseType,
  weightRelevant,
}: {
  history: SessionSummary[];
  formatDate: (iso: string) => string;
  formatKg: (v: number) => string;
  exerciseType: ExerciseType;
  weightRelevant: boolean;
}) {
  if (history.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 32 }}>
        <BarChart3 size={36} style={{ color: "var(--muted)", opacity: 0.4 }} />
        <strong>Sin historial</strong>
        <p>Completa series de este ejercicio para ver el historial aquí.</p>
      </div>
    );
  }

  const isCardio = exerciseType === "cardio";
  const isDuration = exerciseType === "duration";

  return (
    <>
      {history.map(({ session, sets }) => {
        const completedSets = sets.filter((s) => s.completed);
        const vol = completedSets.reduce(
          (sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0),
          0,
        );
        return (
          <div className="detail-history-item" key={session.id}>
            <div className="detail-history-date">
              {formatDate(session.startedAt)} · {session.routineNameSnapshot ?? "Sesión manual"}
            </div>
            <div className="detail-history-sets">
              {completedSets.map((s, i) => {
                const text = (() => {
                  if (isCardio) return `${s.weightKg ?? "—"} km × ${s.reps ?? "—"} min`;
                  if (isDuration) {
                    if (weightRelevant) {
                      return `${s.weightKg && s.weightKg > 0 ? `${s.weightKg} kg × ` : ""}${s.reps ?? "—"}s`;
                    }
                    return `${s.reps ?? "—"}s`;
                  }
                  if (weightRelevant) {
                    return `${s.weightKg ?? "—"} kg × ${s.reps ?? "—"}`;
                  }
                  return `${s.reps ?? "—"} reps`;
                })();

                return (
                  <span key={s.id} style={{ marginRight: 8, color: "var(--text-secondary)" }}>
                    {i + 1}. {text}
                  </span>
                );
              })}
              {!isCardio && !isDuration && weightRelevant && vol > 0 && (
                <span style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                  · {formatKg(vol)} kg vol.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Tab: Indicaciones ─────────────────────────────────────────────────────────

function IndicacionesTab({ exercise }: { exercise: Exercise }) {
  return (
    <>
      {exercise.guide.setup.length > 0 && (
        <div className="detail-section">
          <strong
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--muted)",
              marginBottom: 8,
            }}
          >
            Preparación
          </strong>
          <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {exercise.guide.setup.map((item) => (
              <li
                key={item}
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exercise.guide.technique.length > 0 && (
        <div className="detail-section">
          <strong
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--muted)",
              marginBottom: 8,
            }}
          >
            Técnica
          </strong>
          <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {exercise.guide.technique.map((item) => (
              <li
                key={item}
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exercise.guide.commonMistakes.length > 0 && (
        <div className="detail-section">
          <strong
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--danger)",
              marginBottom: 8,
            }}
          >
            Errores comunes
          </strong>
          <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
            {exercise.guide.commonMistakes.map((item) => (
              <li
                key={item}
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: 4,
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exercise.guide.setup.length === 0 &&
        exercise.guide.technique.length === 0 &&
        exercise.guide.commonMistakes.length === 0 && (
          <div className="empty-state">
            <strong>Sin indicaciones disponibles</strong>
            <p>Este ejercicio aún no tiene guía detallada.</p>
          </div>
        )}
    </>
  );
}
