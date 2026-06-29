import { ExternalLink, Video } from "lucide-react";
import type { CSSProperties } from "react";
import type { ExerciseGuide, ExerciseMedia } from "../domain";

type ExerciseVisualSource = {
  name: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  tags?: string[];
  guide: ExerciseGuide;
  media?: ExerciseMedia;
};

type MuscleIntensity = {
  muscle: string;
  value: number;
};

type MuscleZoneId = "upper" | "arms" | "core" | "lower";

type MuscleZone = {
  id: MuscleZoneId;
  label: string;
  shortLabel: string;
  muscles: string[];
};

type MuscleZoneSummary = MuscleZone & {
  score: number;
};

const MUSCLE_ZONES: MuscleZone[] = [
  {
    id: "upper",
    label: "Torso",
    shortLabel: "Torso",
    muscles: [
      "pecho",
      "espalda",
      "espalda alta",
      "espalda baja",
      "hombros",
      "hombro anterior",
      "hombro posterior",
      "trapecio",
      "rotadores externos",
    ],
  },
  {
    id: "arms",
    label: "Brazos",
    shortLabel: "Brazos",
    muscles: ["bíceps", "tríceps", "antebrazos"],
  },
  {
    id: "core",
    label: "Core",
    shortLabel: "Core",
    muscles: ["core", "flexores de cadera"],
  },
  {
    id: "lower",
    label: "Piernas",
    shortLabel: "Piernas",
    muscles: [
      "cuádriceps",
      "glúteos",
      "isquiotibiales",
      "pantorrillas",
      "aductores",
      "cadera",
      "piernas",
    ],
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
      <ExerciseVideoSnippet exercise={exercise} compact={compact} />
      <BodyMuscleMap
        title="Músculos"
        primaryMuscles={exercise.primaryMuscles ?? []}
        secondaryMuscles={exercise.secondaryMuscles ?? []}
        compact={compact}
      />
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
  const primaryLabels = dedupeLabels(primaryMuscles);
  const secondaryLabels = dedupeLabels(secondaryMuscles);
  const sortedIntensities = dedupeIntensities(intensities)
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxIntensity = Math.max(...sortedIntensities.map((entry) => entry.value), 1);
  const activeMuscles = sortedIntensities.length > 0 ? sortedIntensities.map((entry) => entry.muscle) : [
    ...primaryMuscles,
    ...secondaryMuscles,
  ];
  const zoneSummaries =
    sortedIntensities.length > 0
      ? buildIntensityZones(sortedIntensities)
      : buildExerciseZones(primaryLabels, secondaryLabels);
  const ariaLabel =
    activeMuscles.length > 0
      ? `${title}: ${dedupeLabels(activeMuscles).join(", ")}`
      : `${title}: sin músculos registrados`;

  return (
    <div
      className="body-muscle-map muscle-focus-card"
      data-compact={compact}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="visual-section-header">
        <strong>{title}</strong>
        <span>{sortedIntensities.length > 0 ? "Carga reciente" : "Foco del movimiento"}</span>
      </div>
      <div className="muscle-zone-strip" aria-hidden="true">
        {zoneSummaries.map((zone) => (
          <div
            className="muscle-zone-pill"
            data-active={zone.score > 0}
            key={zone.id}
            style={{ "--zone-strength": `${Math.round(zone.score * 100)}%` } as CSSProperties}
          >
            <span>{zone.shortLabel}</span>
          </div>
        ))}
      </div>
      {sortedIntensities.length > 0 ? (
        <div className="muscle-load-bars">
          {sortedIntensities.slice(0, compact ? 4 : 6).map((entry) => (
            <div className="muscle-load-row" key={entry.muscle}>
              <span>{entry.muscle}</span>
              <div className="muscle-load-track" aria-hidden="true">
                <span style={{ width: `${Math.max(8, (entry.value / maxIntensity) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="muscle-focus-groups">
          <MuscleGroup title="Primarios" muscles={primaryLabels} tone="primary" compact={compact} />
          <MuscleGroup
            title="Secundarios"
            muscles={secondaryLabels}
            tone="secondary"
            compact={compact}
          />
        </div>
      )}
    </div>
  );
}

function MuscleGroup({
  title,
  muscles,
  tone,
  compact,
}: {
  title: string;
  muscles: string[];
  tone: "primary" | "secondary";
  compact: boolean;
}) {
  const visibleMuscles = muscles.slice(0, compact ? 4 : 8);

  return (
    <div className="muscle-focus-group" data-tone={tone}>
      <span>{title}</span>
      {visibleMuscles.length > 0 ? (
        <div className="muscle-chip-list" aria-label={title}>
          {visibleMuscles.map((muscle) => (
            <span className="muscle-chip" key={`${tone}-${muscle}`}>
              {muscle}
            </span>
          ))}
        </div>
      ) : (
        <small>Sin registro</small>
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
  const media = exercise.media;

  return (
    <div className="exercise-video-snippet" data-compact={compact}>
      <div className="visual-section-header">
        <strong>Cómo hacerlo</strong>
        <span>{media ? "Imagen y animación" : "YouTube"}</span>
      </div>
      {media ? (
        <ExerciseDatasetMedia exerciseName={exercise.name} media={media} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

function ExerciseDatasetMedia({
  exerciseName,
  media,
}: {
  exerciseName: string;
  media: ExerciseMedia;
}) {
  return (
    <div className="dataset-media-card">
      <div
        className="dataset-media-frame"
        style={{ backgroundImage: `url(${media.imageUrl})` }}
      >
        <img
          src={media.animationUrl}
          alt={`Animación de ${exerciseName}`}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="dataset-media-copy">
        <strong>{exerciseName}</strong>
        <small>Referencia visual: {media.sourceExerciseName}</small>
      </div>
      <a
        className="dataset-media-source"
        href={media.sourceUrl}
        rel="noreferrer"
        target="_blank"
      >
        Fuente
        <ExternalLink size={13} aria-hidden="true" />
      </a>
    </div>
  );
}

function dedupeIntensities(intensities: MuscleIntensity[]): MuscleIntensity[] {
  const intensityByName = new Map<string, MuscleIntensity>();

  for (const intensity of intensities) {
    const key = normalizeMuscleName(intensity.muscle);
    if (key.length === 0) continue;

    const current = intensityByName.get(key);
    if (!current || intensity.value > current.value) {
      intensityByName.set(key, intensity);
    }
  }

  return Array.from(intensityByName.values());
}

function buildIntensityZones(intensities: MuscleIntensity[]): MuscleZoneSummary[] {
  const maxZoneScore = Math.max(
    ...MUSCLE_ZONES.map((zone) => {
      return intensities.reduce((total, intensity) => {
        return total + (zoneMatchesMuscle(zone, intensity.muscle) ? intensity.value : 0);
      }, 0);
    }),
    1,
  );

  return MUSCLE_ZONES.map((zone) => {
    const total = intensities.reduce((sum, intensity) => {
      return sum + (zoneMatchesMuscle(zone, intensity.muscle) ? intensity.value : 0);
    }, 0);

    return {
      ...zone,
      score: Math.min(1, total / maxZoneScore),
    };
  });
}

function buildExerciseZones(
  primaryMuscles: string[],
  secondaryMuscles: string[],
): MuscleZoneSummary[] {
  return MUSCLE_ZONES.map((zone) => {
    const primaryScore = primaryMuscles.some((muscle) => zoneMatchesMuscle(zone, muscle)) ? 1 : 0;
    const secondaryScore = secondaryMuscles.some((muscle) => zoneMatchesMuscle(zone, muscle))
      ? 0.45
      : 0;

    return {
      ...zone,
      score: Math.max(primaryScore, secondaryScore),
    };
  });
}

function zoneMatchesMuscle(zone: MuscleZone, muscle: string): boolean {
  const normalizedMuscle = normalizeMuscleName(muscle);
  return zone.muscles.some((zoneMuscle) => normalizedMuscle === normalizeMuscleName(zoneMuscle));
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
