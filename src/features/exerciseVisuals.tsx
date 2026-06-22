import { ExternalLink, Video } from "lucide-react";
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
      <ExerciseVideoSnippet exercise={exercise} compact={compact} />
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
        <defs>
          <linearGradient id="mannequin-grad-inactive" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="30%" stopColor="#334155" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="mannequin-grad-primary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="30%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="70%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="mannequin-grad-secondary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="35%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#7dd3fc" />
            <stop offset="65%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          <linearGradient id="mannequin-grad-heat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="35%" stopColor="#d97706" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="65%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
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

export function ExerciseVideoSnippet({
  exercise,
  compact = false,
}: {
  exercise: ExerciseVisualSource;
  compact?: boolean;
}) {
  const query = buildYoutubeQuery(exercise.name);
  const searchUrl = buildYoutubeSearchUrl(query);

  return (
    <div className="exercise-video-snippet" data-compact={compact}>
      <div className="visual-section-header">
        <strong>Cómo hacerlo</strong>
        <span>YouTube</span>
      </div>
      <a className="youtube-snippet-card" href={searchUrl} rel="noreferrer" target="_blank">
        <span className="youtube-snippet-thumb" aria-hidden="true">
          <Video size={24} strokeWidth={2.2} />
          <span>Video</span>
        </span>
        <span className="youtube-snippet-copy">
          <strong>{exercise.name}</strong>
          <small>Buscar técnica y ejecución en YouTube</small>
        </span>
        <ExternalLink size={15} aria-hidden="true" />
      </a>
      <p className="youtube-snippet-note">
        Elige videos que coincidan con tu equipo y mantén cargas conservadoras si estás
        aprendiendo el movimiento.
      </p>
    </div>
  );
}

function BodyOutline({ offsetX, label }: { offsetX: number; label: string }) {
  return (
    <g aria-hidden="true" className="body-outline-group">
      <text x={offsetX + 55} y="232" textAnchor="middle">
        {label}
      </text>
      <circle cx={offsetX + 55} cy="22" r="12" className="body-part-solid" />
      <path
        d={`M${offsetX + 49} 35 H${offsetX + 61} L${offsetX + 64} 49 H${offsetX + 46} Z`}
        className="body-part-solid"
      />
      <path
        d={`M${offsetX + 34} 52 C${offsetX + 42} 43 ${offsetX + 68} 43 ${
          offsetX + 76
        } 52 L${offsetX + 70} 126 C${offsetX + 63} 133 ${offsetX + 47} 133 ${
          offsetX + 40
        } 126 Z`}
        className="body-part-solid"
      />
      <path
        d={`M${offsetX + 31} 62 C${offsetX + 20} 86 ${offsetX + 21} 118 ${offsetX + 30} 140`}
        className="body-part-arm"
      />
      <path
        d={`M${offsetX + 79} 62 C${offsetX + 90} 86 ${offsetX + 89} 118 ${offsetX + 80} 140`}
        className="body-part-arm"
      />
      <path
        d={`M${offsetX + 43} 127 L${offsetX + 36} 224`}
        className="body-part-leg"
      />
      <path
        d={`M${offsetX + 67} 127 L${offsetX + 74} 224`}
        className="body-part-leg"
      />
    </g>
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

function buildYoutubeQuery(exerciseName: string): string {
  return `${exerciseName} técnica ejercicio tutorial gimnasio`;
}

function buildYoutubeSearchUrl(query: string): string {
  const params = new URLSearchParams({
    search_query: query,
  });

  return `https://www.youtube.com/results?${params.toString()}`;
}
