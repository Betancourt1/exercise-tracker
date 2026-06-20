import type { Exercise } from "../domain/types";
import { normalizeExerciseName, toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";

export const EXERCISE_LIBRARY_SEED_META_ID = "seed:exercise-library:1";

type SeedExerciseInput = Pick<
  Exercise,
  "name" | "primaryMuscles" | "secondaryMuscles" | "equipment" | "tags" | "guide"
>;

const seedExerciseInputs: SeedExerciseInput[] = [
  {
    name: "Sentadilla",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["barra", "rack"],
    tags: ["fuerza", "pierna", "compuesto"],
    guide: {
      setup: ["Coloca la barra estable sobre la espalda alta.", "Pies al ancho de hombros."],
      technique: ["Baja con control manteniendo el torso firme.", "Empuja el piso para subir."],
      commonMistakes: ["Rodillas colapsando hacia adentro.", "Perder tensión en el core."],
    },
  },
  {
    name: "Press banca",
    primaryMuscles: ["pecho"],
    secondaryMuscles: ["tríceps", "hombro anterior"],
    equipment: ["barra", "banca"],
    tags: ["fuerza", "empuje", "compuesto"],
    guide: {
      setup: ["Apoya pies firmes en el piso.", "Junta escápulas antes de sacar la barra."],
      technique: ["Baja la barra con trayectoria controlada.", "Empuja sin perder estabilidad."],
      commonMistakes: ["Rebotar la barra en el pecho.", "Levantar la cadera de la banca."],
    },
  },
  {
    name: "Remo con barra",
    primaryMuscles: ["espalda"],
    secondaryMuscles: ["bíceps", "core"],
    equipment: ["barra"],
    tags: ["tirón", "espalda", "compuesto"],
    guide: {
      setup: ["Inclina el torso con espalda neutra.", "Toma la barra con agarre firme."],
      technique: ["Lleva la barra hacia el torso.", "Controla la bajada sin redondear espalda."],
      commonMistakes: ["Usar impulso excesivo.", "Elevar el torso en cada repetición."],
    },
  },
  {
    name: "Peso muerto rumano",
    primaryMuscles: ["isquiotibiales", "glúteos"],
    secondaryMuscles: ["espalda baja", "core"],
    equipment: ["barra", "mancuernas"],
    tags: ["bisagra", "pierna", "posterior"],
    guide: {
      setup: ["Empieza de pie con la carga cerca del cuerpo.", "Flexiona ligeramente rodillas."],
      technique: ["Lleva la cadera hacia atrás.", "Sube apretando glúteos sin hiperextender."],
      commonMistakes: ["Convertirlo en sentadilla.", "Alejar la carga del cuerpo."],
    },
  },
  {
    name: "Zancadas",
    primaryMuscles: ["cuádriceps", "glúteos"],
    secondaryMuscles: ["isquiotibiales", "core"],
    equipment: ["peso corporal", "mancuernas"],
    tags: ["unilateral", "pierna"],
    guide: {
      setup: ["Da un paso estable hacia adelante o atrás.", "Mantén mirada al frente."],
      technique: ["Baja hasta una profundidad controlada.", "Empuja con la pierna principal."],
      commonMistakes: ["Paso demasiado corto.", "Perder equilibrio por ir demasiado rápido."],
    },
  },
  {
    name: "Press militar",
    primaryMuscles: ["hombros"],
    secondaryMuscles: ["tríceps", "core"],
    equipment: ["barra", "mancuernas"],
    tags: ["empuje", "tren superior", "compuesto"],
    guide: {
      setup: ["Coloca la carga a la altura de hombros.", "Aprieta glúteos y abdomen."],
      technique: ["Empuja verticalmente sin arquear la espalda.", "Bloquea arriba con control."],
      commonMistakes: ["Inclinarse hacia atrás.", "Perder tensión del abdomen."],
    },
  },
];

export function createSeedExercises(now = toIsoUtc()): Exercise[] {
  return seedExerciseInputs.map((exercise) => ({
    ...exercise,
    id: createSeedExerciseId(exercise.name),
    nameNormalized: normalizeExerciseName(exercise.name),
    isCustom: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function seedExerciseLibrary(db: WorkoutDatabase = appDb): Promise<number> {
  const now = toIsoUtc();

  try {
    return await db.transaction("rw", db.meta, db.exercises, async () => {
      const existingSeed = await db.meta.get(EXERCISE_LIBRARY_SEED_META_ID);
      if (existingSeed) {
        return 0;
      }

      const seedExercises = createSeedExercises(now);
      const existingExercises = await db.exercises.toArray();
      const existingNames = new Set(
        existingExercises.map((exercise) => exercise.nameNormalized),
      );
      const missingExercises = seedExercises.filter(
        (exercise) => !existingNames.has(exercise.nameNormalized),
      );

      if (missingExercises.length > 0) {
        await db.exercises.bulkAdd(missingExercises);
      }

      await db.meta.put({
        id: EXERCISE_LIBRARY_SEED_META_ID,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        value: {
          insertedCount: missingExercises.length,
        },
      });

      return missingExercises.length;
    });
  } catch (error) {
    const existingSeed = await db.meta.get(EXERCISE_LIBRARY_SEED_META_ID);
    if (existingSeed && isConstraintError(error)) {
      return 0;
    }

    throw error;
  }
}

function createSeedExerciseId(name: string): string {
  return `seed:exercise:${normalizeExerciseName(name).replace(/\s+/g, "-")}`;
}

function isConstraintError(error: unknown): boolean {
  return (
    isRecord(error) &&
    (error.name === "ConstraintError" || error.name === "BulkError")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
