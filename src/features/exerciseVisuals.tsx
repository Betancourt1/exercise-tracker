import { useId } from "react";
import type { ExerciseGuide } from "../domain";

type ExerciseVisualSource = {
  name: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  tags?: string[];
  guide: ExerciseGuide;
};

type MuscleIntensity = {
  muscle: string;
  value: number;
};

type BodyRegion = {
  id: string;
  label: string;
  muscles: string[];
  d: string;
};

type RegionState = "inactive" | "primary" | "secondary" | "heat";

type MotionPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "push"
  | "pull"
  | "core"
  | "carry"
  | "isolation";

const FRONT_REGIONS: BodyRegion[] = [
  {
    id: "front-chest",
    label: "Pecho",
    muscles: ["pecho"],
    d: "M42 52 C46 46 64 46 68 52 L66 76 C61 72 49 72 44 76 Z",
  },
  {
    id: "front-core",
    label: "Core",
    muscles: ["core"],
    d: "M45 76 H65 L67 112 C61 116 49 116 43 112 Z",
  },
  {
    id: "front-left-shoulder",
    label: "Hombro anterior",
    muscles: ["hombros", "hombro anterior"],
    d: "M31 54 C34 48 41 47 45 52 L42 67 C36 69 30 64 31 54 Z",
  },
  {
    id: "front-right-shoulder",
    label: "Hombro anterior",
    muscles: ["hombros", "hombro anterior"],
    d: "M65 52 C69 47 76 48 79 54 C80 64 74 69 68 67 Z",
  },
  {
    id: "front-left-biceps",
    label: "Bíceps",
    muscles: ["bíceps"],
    d: "M28 66 C35 65 38 70 36 84 L32 103 C26 100 24 94 25 86 Z",
  },
  {
    id: "front-right-biceps",
    label: "Bíceps",
    muscles: ["bíceps"],
    d: "M74 66 C81 65 85 73 85 86 L82 103 C76 100 73 92 74 82 Z",
  },
  {
    id: "front-left-forearm",
    label: "Antebrazo",
    muscles: ["antebrazos"],
    d: "M31 102 C36 103 38 109 35 121 L31 138 C25 137 23 132 25 120 Z",
  },
  {
    id: "front-right-forearm",
    label: "Antebrazo",
    muscles: ["antebrazos"],
    d: "M79 102 C85 112 87 124 84 138 C78 137 75 132 75 121 C74 111 75 105 79 102 Z",
  },
  {
    id: "front-left-hip",
    label: "Cadera",
    muscles: ["cadera", "flexores de cadera"],
    d: "M43 112 C48 116 52 118 55 119 L53 136 L40 135 Z",
  },
  {
    id: "front-right-hip",
    label: "Cadera",
    muscles: ["cadera", "flexores de cadera"],
    d: "M55 119 C58 118 62 116 67 112 L70 135 L57 136 Z",
  },
  {
    id: "front-left-quad",
    label: "Cuádriceps",
    muscles: ["cuádriceps", "piernas"],
    d: "M39 136 L53 136 L50 184 C43 184 38 181 36 176 Z",
  },
  {
    id: "front-right-quad",
    label: "Cuádriceps",
    muscles: ["cuádriceps", "piernas"],
    d: "M57 136 L71 136 L74 176 C72 181 67 184 60 184 Z",
  },
  {
    id: "front-adductors",
    label: "Aductores",
    muscles: ["aductores"],
    d: "M50 137 H60 L58 181 C56 184 54 184 52 181 Z",
  },
  {
    id: "front-left-calf",
    label: "Pantorrilla",
    muscles: ["pantorrillas", "piernas"],
    d: "M38 184 C45 187 50 187 52 184 L50 224 L38 224 Z",
  },
  {
    id: "front-right-calf",
    label: "Pantorrilla",
    muscles: ["pantorrillas", "piernas"],
    d: "M58 184 C64 187 70 187 73 184 L72 224 L60 224 Z",
  },
];

const BACK_REGIONS: BodyRegion[] = [
  {
    id: "back-traps",
    label: "Trapecio y espalda alta",
    muscles: ["trapecio", "espalda alta", "espalda"],
    d: "M148 48 C154 44 176 44 182 48 L174 70 H156 Z",
  },
  {
    id: "back-lats",
    label: "Espalda",
    muscles: ["espalda", "espalda alta"],
    d: "M152 68 H178 L183 106 C176 114 154 114 147 106 Z",
  },
  {
    id: "back-low",
    label: "Espalda baja",
    muscles: ["espalda baja", "core"],
    d: "M154 105 C161 110 169 110 176 105 L178 125 C171 130 159 130 152 125 Z",
  },
  {
    id: "back-left-shoulder",
    label: "Hombro posterior",
    muscles: ["hombros", "hombro posterior", "rotadores externos"],
    d: "M139 54 C142 48 150 47 154 51 L151 68 C143 69 137 64 139 54 Z",
  },
  {
    id: "back-right-shoulder",
    label: "Hombro posterior",
    muscles: ["hombros", "hombro posterior", "rotadores externos"],
    d: "M176 51 C180 47 188 48 191 54 C193 64 186 69 179 68 Z",
  },
  {
    id: "back-left-triceps",
    label: "Tríceps",
    muscles: ["tríceps"],
    d: "M136 66 C143 65 147 70 145 84 L141 103 C135 100 132 93 133 84 Z",
  },
  {
    id: "back-right-triceps",
    label: "Tríceps",
    muscles: ["tríceps"],
    d: "M185 66 C192 65 196 73 196 84 L193 103 C187 100 184 92 185 82 Z",
  },
  {
    id: "back-left-forearm",
    label: "Antebrazo",
    muscles: ["antebrazos"],
    d: "M140 102 C145 103 147 109 144 121 L140 138 C134 137 132 132 134 120 Z",
  },
  {
    id: "back-right-forearm",
    label: "Antebrazo",
    muscles: ["antebrazos"],
    d: "M190 102 C196 112 198 124 195 138 C189 137 186 132 186 121 C185 111 186 105 190 102 Z",
  },
  {
    id: "back-glutes",
    label: "Glúteos",
    muscles: ["glúteos", "cadera", "rotadores externos"],
    d: "M151 124 C158 130 172 130 179 124 L181 145 C172 153 158 153 149 145 Z",
  },
  {
    id: "back-left-hamstring",
    label: "Isquiotibiales",
    muscles: ["isquiotibiales", "piernas"],
    d: "M148 145 C154 151 160 153 165 151 L160 188 C152 188 146 183 145 176 Z",
  },
  {
    id: "back-right-hamstring",
    label: "Isquiotibiales",
    muscles: ["isquiotibiales", "piernas"],
    d: "M165 151 C171 153 177 151 183 145 L186 176 C184 183 178 188 170 188 Z",
  },
  {
    id: "back-left-calf",
    label: "Pantorrilla",
    muscles: ["pantorrillas", "piernas"],
    d: "M146 187 C153 190 158 190 161 187 L159 224 L147 224 Z",
  },
  {
    id: "back-right-calf",
    label: "Pantorrilla",
    muscles: ["pantorrillas", "piernas"],
    d: "M170 187 C176 190 182 190 185 187 L184 224 L172 224 Z",
  },
];

const MOTION_LABELS: Record<MotionPattern, string> = {
  squat: "Sentadilla / empuje de pierna",
  hinge: "Bisagra de cadera",
  lunge: "Trabajo unilateral",
  push: "Empuje",
  pull: "Tirón",
  core: "Estabilidad de core",
  carry: "Carga y marcha",
  isolation: "Aislamiento controlado",
};

export function ExerciseVisualPanel({
  exercise,
  compact = false,
}: {
  exercise: ExerciseVisualSource;
  compact?: boolean;
}) {
  return (
    <div className="exercise-visuals" data-compact={compact}>
      <BodyMuscleMap
        title="Músculos"
        primaryMuscles={exercise.primaryMuscles ?? []}
        secondaryMuscles={exercise.secondaryMuscles ?? []}
        compact={compact}
      />
      <ExerciseMotionIllustration exercise={exercise} compact={compact} />
    </div>
  );
}

export function BodyMuscleMap({
  title,
  primaryMuscles = [],
  secondaryMuscles = [],
  intensities = [],
  compact = false,
}: {
  title: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  intensities?: MuscleIntensity[];
  compact?: boolean;
}) {
  const primarySet = new Set(primaryMuscles.map(normalizeMuscleName));
  const secondarySet = new Set(secondaryMuscles.map(normalizeMuscleName));
  const intensityByMuscle = new Map(
    intensities.map((entry) => [normalizeMuscleName(entry.muscle), entry.value]),
  );
  const maxIntensity = Math.max(...intensities.map((entry) => entry.value), 1);
  const activeMuscles = intensities.length > 0 ? intensities.map((entry) => entry.muscle) : [
    ...primaryMuscles,
    ...secondaryMuscles,
  ];
  const ariaLabel =
    activeMuscles.length > 0
      ? `${title}: ${dedupeLabels(activeMuscles).join(", ")}`
      : `${title}: sin músculos registrados`;

  return (
    <div className="body-muscle-map" data-compact={compact}>
      <div className="visual-section-header">
        <strong>{title}</strong>
        <span>{intensities.length > 0 ? "Intensidad relativa" : "Primarios y secundarios"}</span>
      </div>
      <svg
        className="body-map-svg"
        viewBox="0 0 220 236"
        role="img"
        aria-label={ariaLabel}
      >
        <BodyOutline offsetX={0} label="Frente" />
        <BodyOutline offsetX={110} label="Espalda" />
        {[...FRONT_REGIONS, ...BACK_REGIONS].map((region) => {
          const intensity = getRegionIntensity(region, intensityByMuscle);
          const state = getRegionState(region, primarySet, secondarySet, intensity);
          const opacity =
            state === "heat"
              ? Math.min(0.92, 0.2 + (intensity / maxIntensity) * 0.72)
              : state === "primary"
                ? 0.92
                : state === "secondary"
                  ? 0.55
                  : 1;

          return (
            <path
              aria-hidden="true"
              className="body-region"
              data-state={state}
              d={region.d}
              key={region.id}
              style={{ opacity }}
            />
          );
        })}
      </svg>
      {intensities.length > 0 ? null : (
        <div className="muscle-chip-list" aria-label="Músculos del ejercicio">
          {primaryMuscles.slice(0, compact ? 3 : 6).map((muscle) => (
            <span className="muscle-chip primary" key={`primary-${muscle}`}>
              {muscle}
            </span>
          ))}
          {secondaryMuscles.slice(0, compact ? 3 : 6).map((muscle) => (
            <span className="muscle-chip secondary" key={`secondary-${muscle}`}>
              {muscle}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExerciseMotionIllustration({
  exercise,
  compact = false,
}: {
  exercise: ExerciseVisualSource;
  compact?: boolean;
}) {
  const pattern = getMotionPattern(exercise);
  const steps = getMotionSteps(exercise);

  return (
    <div className="exercise-motion" data-compact={compact}>
      <div className="visual-section-header">
        <strong>Cómo hacerlo</strong>
        <span>{MOTION_LABELS[pattern]}</span>
      </div>
      <MotionFigure pattern={pattern} label={`${exercise.name}: ${MOTION_LABELS[pattern]}`} />
      <ol className="motion-step-list">
        {steps.slice(0, compact ? 2 : 3).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function BodyOutline({ offsetX, label }: { offsetX: number; label: string }) {
  return (
    <g aria-hidden="true" className="body-outline-group">
      <text x={offsetX + 55} y="232" textAnchor="middle">
        {label}
      </text>
      <circle cx={offsetX + 55} cy="22" r="12" />
      <path d={`M${offsetX + 49} 35 H${offsetX + 61} L${offsetX + 64} 49 H${offsetX + 46} Z`} />
      <path
        d={`M${offsetX + 34} 52 C${offsetX + 42} 43 ${offsetX + 68} 43 ${
          offsetX + 76
        } 52 L${offsetX + 70} 126 C${offsetX + 63} 133 ${offsetX + 47} 133 ${
          offsetX + 40
        } 126 Z`}
      />
      <path d={`M${offsetX + 31} 62 C${offsetX + 20} 86 ${offsetX + 21} 118 ${offsetX + 30} 140`} />
      <path d={`M${offsetX + 79} 62 C${offsetX + 90} 86 ${offsetX + 89} 118 ${offsetX + 80} 140`} />
      <path d={`M${offsetX + 43} 127 L${offsetX + 36} 224`} />
      <path d={`M${offsetX + 67} 127 L${offsetX + 74} 224`} />
    </g>
  );
}

function MotionFigure({ pattern, label }: { pattern: MotionPattern; label: string }) {
  const arrowId = useId().replace(/:/g, "");

  return (
    <svg className="motion-svg" viewBox="0 0 180 108" role="img" aria-label={label}>
      <defs>
        <marker
          id={`${arrowId}-arrow`}
          markerHeight="6"
          markerWidth="6"
          orient="auto"
          refX="5"
          refY="3"
        >
          <path d="M0 0 L6 3 L0 6 Z" />
        </marker>
      </defs>
      <MotionShape pattern={pattern} arrowId={`${arrowId}-arrow`} />
    </svg>
  );
}

function MotionShape({
  pattern,
  arrowId,
}: {
  pattern: MotionPattern;
  arrowId: string;
}) {
  const arrow = `url(#${arrowId})`;

  if (pattern === "squat") {
    return (
      <>
        <path className="motion-floor" d="M28 92 H152" />
        <circle className="motion-head" cx="48" cy="24" r="7" />
        <path className="motion-limb" d="M48 32 L48 56 L38 88" />
        <path className="motion-limb" d="M48 56 L61 88" />
        <path className="motion-limb" d="M38 45 L58 45" />
        <circle className="motion-head" cx="118" cy="34" r="7" />
        <path className="motion-limb strong" d="M118 42 L108 62 L89 86" />
        <path className="motion-limb strong" d="M108 62 L134 86" />
        <path className="motion-limb" d="M102 50 L126 50" />
        <path className="motion-arrow" d="M82 26 C92 42 92 60 84 76" markerEnd={arrow} />
      </>
    );
  }

  if (pattern === "hinge") {
    return (
      <>
        <path className="motion-floor" d="M28 92 H154" />
        <circle className="motion-head" cx="56" cy="24" r="7" />
        <path className="motion-limb" d="M56 32 L56 58 L48 90" />
        <path className="motion-limb" d="M56 58 L67 90" />
        <circle className="motion-head" cx="118" cy="42" r="7" />
        <path className="motion-limb strong" d="M112 50 L84 65 L78 90" />
        <path className="motion-limb strong" d="M84 65 L111 90" />
        <path className="motion-limb" d="M100 57 L126 72" />
        <path className="motion-arrow" d="M81 39 C96 32 111 31 128 36" markerEnd={arrow} />
      </>
    );
  }

  if (pattern === "lunge") {
    return (
      <>
        <path className="motion-floor" d="M24 92 H156" />
        <circle className="motion-head" cx="88" cy="24" r="7" />
        <path className="motion-limb strong" d="M88 32 L88 55 L63 90" />
        <path className="motion-limb strong" d="M88 55 L125 90" />
        <path className="motion-limb" d="M77 45 L101 45" />
        <path className="motion-arrow" d="M48 76 C62 64 76 58 91 56" markerEnd={arrow} />
      </>
    );
  }

  if (pattern === "push") {
    return (
      <>
        <path className="motion-floor" d="M28 82 H152" />
        <path className="motion-bench" d="M42 68 H116" />
        <circle className="motion-head" cx="52" cy="56" r="6" />
        <path className="motion-limb strong" d="M58 61 L96 67 L126 48" />
        <path className="motion-limb" d="M74 68 L104 82" />
        <path className="motion-load" d="M115 46 H146" />
        <path className="motion-arrow" d="M126 56 C128 46 130 37 133 28" markerEnd={arrow} />
      </>
    );
  }

  if (pattern === "pull") {
    return (
      <>
        <path className="motion-floor" d="M28 90 H152" />
        <path className="motion-load" d="M38 24 V76" />
        <circle className="motion-head" cx="118" cy="34" r="7" />
        <path className="motion-limb" d="M116 42 L106 66 L126 88" />
        <path className="motion-limb strong" d="M106 55 L61 44" />
        <path className="motion-limb strong" d="M108 61 L63 58" />
        <path className="motion-arrow" d="M66 34 C83 36 94 42 105 53" markerEnd={arrow} />
      </>
    );
  }

  if (pattern === "core") {
    return (
      <>
        <path className="motion-floor" d="M28 86 H152" />
        <circle className="motion-head" cx="54" cy="57" r="7" />
        <path className="motion-limb strong" d="M61 60 L105 66 L138 76" />
        <path className="motion-limb" d="M77 63 L67 84" />
        <path className="motion-limb" d="M125 72 L145 85" />
        <path className="motion-arrow" d="M72 45 C91 38 111 39 128 47" markerEnd={arrow} />
      </>
    );
  }

  if (pattern === "carry") {
    return (
      <>
        <path className="motion-floor" d="M28 92 H152" />
        <circle className="motion-head" cx="82" cy="24" r="7" />
        <path className="motion-limb strong" d="M82 32 L82 58 L72 90" />
        <path className="motion-limb strong" d="M82 58 L94 90" />
        <path className="motion-limb" d="M70 45 L58 72" />
        <path className="motion-limb" d="M94 45 L108 72" />
        <rect className="motion-load" x="52" y="70" width="12" height="14" rx="3" />
        <rect className="motion-load" x="104" y="70" width="12" height="14" rx="3" />
        <path className="motion-arrow" d="M110 34 H145" markerEnd={arrow} />
      </>
    );
  }

  return (
    <>
      <path className="motion-floor" d="M28 92 H152" />
      <circle className="motion-head" cx="84" cy="26" r="7" />
      <path className="motion-limb" d="M84 34 L84 58 L74 90" />
      <path className="motion-limb" d="M84 58 L96 90" />
      <path className="motion-limb strong" d="M84 43 L116 58" />
      <path className="motion-limb strong" d="M116 58 L103 74" />
      <path className="motion-load" d="M99 76 H118" />
      <path className="motion-arrow" d="M124 55 C132 63 132 74 123 82" markerEnd={arrow} />
    </>
  );
}

function getRegionState(
  region: BodyRegion,
  primarySet: Set<string>,
  secondarySet: Set<string>,
  intensity: number,
): RegionState {
  if (intensity > 0) {
    return "heat";
  }

  if (region.muscles.some((muscle) => primarySet.has(normalizeMuscleName(muscle)))) {
    return "primary";
  }

  if (region.muscles.some((muscle) => secondarySet.has(normalizeMuscleName(muscle)))) {
    return "secondary";
  }

  return "inactive";
}

function getRegionIntensity(
  region: BodyRegion,
  intensityByMuscle: Map<string, number>,
): number {
  return region.muscles.reduce(
    (highest, muscle) => Math.max(highest, intensityByMuscle.get(normalizeMuscleName(muscle)) ?? 0),
    0,
  );
}

function getMotionPattern(exercise: ExerciseVisualSource): MotionPattern {
  const text = normalizeMuscleName(`${exercise.name} ${(exercise.tags ?? []).join(" ")}`);

  if (
    text.includes("plancha") ||
    text.includes("dead bug") ||
    text.includes("pallof") ||
    text.includes("crunch") ||
    text.includes("bird dog") ||
    text.includes("elevación de piernas")
  ) {
    return "core";
  }

  if (text.includes("farmer carry")) {
    return "carry";
  }

  if (
    text.includes("zancada") ||
    text.includes("step-up") ||
    text.includes("split squat") ||
    text.includes("unilateral")
  ) {
    return "lunge";
  }

  if (
    text.includes("sentadilla") ||
    text.includes("prensa") ||
    text.includes("hack")
  ) {
    return "squat";
  }

  if (
    text.includes("peso muerto") ||
    text.includes("hip thrust") ||
    text.includes("puente") ||
    text.includes("swing") ||
    text.includes("bisagra") ||
    text.includes("extensión de espalda")
  ) {
    return "hinge";
  }

  if (
    text.includes("remo") ||
    text.includes("jalón") ||
    text.includes("dominada") ||
    text.includes("face pull") ||
    text.includes("pullover") ||
    text.includes("tirón")
  ) {
    return "pull";
  }

  if (
    text.includes("press") ||
    text.includes("flexiones") ||
    text.includes("fondos") ||
    text.includes("cruce") ||
    text.includes("aperturas") ||
    text.includes("empuje")
  ) {
    return "push";
  }

  return "isolation";
}

function getMotionSteps(exercise: ExerciseVisualSource): string[] {
  return [
    exercise.guide.setup[0],
    exercise.guide.technique[0],
    exercise.guide.technique[1] ?? exercise.guide.commonMistakes[0],
  ].filter((item): item is string => Boolean(item));
}

function dedupeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const label of labels) {
    const key = normalizeMuscleName(label);
    if (key.length === 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(label);
  }

  return result;
}

function normalizeMuscleName(value: string): string {
  return value.trim().toLocaleLowerCase("es-MX");
}
