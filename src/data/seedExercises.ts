import type { Exercise, ExerciseMedia, ExerciseType } from "../domain/types";
import { normalizeExerciseName, toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";
import {
  EXERCISES_DATASET_COMMIT,
  exercisesDatasetSeed,
  type DatasetExerciseSeed,
} from "./exercisesDataset.generated";

export const EXERCISE_LIBRARY_SEED_META_ID = "seed:exercise-library:1";

const DATASET_SEED_ID_PREFIX = "seed:exercise:";
const DATASET_REPO = "hasaneyldrm/exercises-dataset";
const EXERCISES_DATASET_ASSET_BASE_URL =
  "https://raw.githubusercontent.com/" + DATASET_REPO + "/" + EXERCISES_DATASET_COMMIT;
const EXERCISES_DATASET_SOURCE_URL =
  "https://github.com/" + DATASET_REPO + "/tree/" + EXERCISES_DATASET_COMMIT;

const muscleLabels: Record<string, string> = {
  abductors: "abductores",
  abdominals: "core",
  abs: "core",
  adductors: "aductores",
  "ankle stabilizers": "tobillos",
  ankles: "tobillos",
  back: "espalda",
  biceps: "bíceps",
  brachialis: "braquial",
  calves: "pantorrillas",
  chest: "pecho",
  core: "core",
  "cardiovascular system": "cardio",
  deltoids: "hombros",
  delts: "hombros",
  feet: "pies",
  forearms: "antebrazos",
  glutes: "glúteos",
  "grip muscles": "agarre",
  groin: "ingle",
  hamstrings: "isquiotibiales",
  hands: "manos",
  "hip flexors": "flexores de cadera",
  "inner thighs": "aductores",
  lats: "espalda",
  "latissimus dorsi": "espalda",
  "levator scapulae": "trapecio",
  "lower abs": "core",
  "lower back": "espalda baja",
  obliques: "core",
  pectorals: "pecho",
  quads: "cuádriceps",
  quadriceps: "cuádriceps",
  "rear deltoids": "hombro posterior",
  rhomboids: "espalda alta",
  "rotator cuff": "rotadores externos",
  "serratus anterior": "serrato anterior",
  shins: "tibiales",
  shoulders: "hombros",
  soleus: "pantorrillas",
  sternocleidomastoid: "cuello",
  spine: "espalda baja",
  traps: "trapecio",
  trapezius: "trapecio",
  triceps: "tríceps",
  "upper back": "espalda alta",
  "upper chest": "pecho superior",
  "wrist extensors": "antebrazos",
  "wrist flexors": "antebrazos",
  wrists: "muñecas",
};

const equipmentLabels: Record<string, string> = {
  assisted: "asistida",
  band: "banda",
  barbell: "barra",
  "body weight": "peso corporal",
  "bosu ball": "bosu",
  cable: "polea",
  dumbbell: "mancuerna",
  "elliptical machine": "elíptica",
  "ez barbell": "barra EZ",
  hammer: "martillo",
  kettlebell: "kettlebell",
  "leverage machine": "máquina",
  "medicine ball": "balón medicinal",
  "olympic barbell": "barra olímpica",
  "resistance band": "banda",
  roller: "rodillo",
  rope: "cuerda",
  "skierg machine": "ski erg",
  "sled machine": "máquina sled",
  "smith machine": "máquina Smith",
  "stability ball": "pelota de estabilidad",
  "stationary bike": "bicicleta fija",
  "stepmill machine": "escaladora",
  tire: "llanta",
  "trap bar": "trap bar",
  "upper body ergometer": "ergómetro superior",
  weighted: "con carga",
  "wheel roller": "rueda abdominal",
};

const bodyPartLabels: Record<string, string> = {
  back: "espalda",
  cardio: "cardio",
  chest: "pecho",
  "lower arms": "antebrazos",
  "lower legs": "pantorrillas",
  neck: "cuello",
  shoulders: "hombros",
  "upper arms": "brazos",
  "upper legs": "piernas",
  waist: "core",
};

export function createSeedExercises(now = toIsoUtc()): Exercise[] {
  return exercisesDatasetSeed.map((exercise) => createSeedExercise(exercise, now));
}

export async function seedExerciseLibrary(db: WorkoutDatabase = appDb): Promise<number> {
  const now = toIsoUtc();

  try {
    return await db.transaction("rw", db.meta, db.exercises, async () => {
      const seedExercises = createSeedExercises(now);
      const seedNames = new Set(seedExercises.map((exercise) => exercise.nameNormalized));
      const existingExercises = await db.exercises.toArray();
      const existingExerciseByName = new Map<string, Exercise>(
        existingExercises.map((exercise) => [exercise.nameNormalized, exercise]),
      );
      const existingNames = new Set(existingExerciseByName.keys());
      const missingExercises = seedExercises.filter(
        (exercise) => !existingNames.has(exercise.nameNormalized),
      );
      const seedUpdates = seedExercises.flatMap((seedExercise) => {
        const existingExercise = existingExerciseByName.get(seedExercise.nameNormalized);

        if (
          !existingExercise ||
          existingExercise.isCustom ||
          !hasSeedExerciseMetadataChanges(existingExercise, seedExercise)
        ) {
          return [];
        }

        return [
          {
            ...existingExercise,
            name: seedExercise.name,
            type: seedExercise.type,
            weightRelevant: seedExercise.weightRelevant,
            primaryMuscles: seedExercise.primaryMuscles,
            secondaryMuscles: seedExercise.secondaryMuscles,
            equipment: seedExercise.equipment,
            equipmentDetail: seedExercise.equipmentDetail,
            tags: seedExercise.tags,
            guide: seedExercise.guide,
            media: seedExercise.media,
            updatedAt: now,
          },
        ];
      });
      const staleSeedUpdates = existingExercises
        .filter((exercise) => {
          return (
            !exercise.isCustom &&
            exercise.archivedAt === null &&
            exercise.id.startsWith(DATASET_SEED_ID_PREFIX) &&
            !seedNames.has(exercise.nameNormalized)
          );
        })
        .map((exercise) => ({
          ...exercise,
          archivedAt: now,
          updatedAt: now,
        }));

      if (missingExercises.length > 0) {
        await db.exercises.bulkPut(missingExercises);
      }

      if (seedUpdates.length > 0) {
        await db.exercises.bulkPut(seedUpdates);
      }

      if (staleSeedUpdates.length > 0) {
        await db.exercises.bulkPut(staleSeedUpdates);
      }

      await db.meta.put({
        id: EXERCISE_LIBRARY_SEED_META_ID,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        value: {
          datasetCommit: EXERCISES_DATASET_COMMIT,
          seedCount: seedExercises.length,
          insertedCount: missingExercises.length,
          updatedCount: seedUpdates.length,
          archivedCount: staleSeedUpdates.length,
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

function createSeedExercise(exercise: DatasetExerciseSeed, now: string): Exercise {
  const primaryMuscles = toUniqueLabels([translateMuscle(exercise.target)]);
  const secondaryMuscles = toUniqueLabels([
    translateMuscle(exercise.muscleGroup),
    ...exercise.secondaryMuscles.map(translateMuscle),
  ]).filter((muscle) => !primaryMuscles.includes(muscle));
  const equipment = translateEquipment(exercise.equipment);
  const type = getExerciseType(exercise);

  return {
    id: createSeedExerciseId(exercise.sourceId),
    name: exercise.name,
    nameNormalized: normalizeExerciseName(exercise.name),
    type,
    weightRelevant: type !== "cardio" && exercise.equipment !== "body weight",
    primaryMuscles,
    secondaryMuscles,
    equipment: [equipment],
    equipmentDetail: getEquipmentDetail(exercise, equipment),
    tags: toUniqueLabels([
      translateBodyPart(exercise.bodyPart),
      translateBodyPart(exercise.category),
      translateMuscle(exercise.target),
      equipment,
    ]),
    guide: createGuide(exercise.instructionsEs),
    media: createExerciseMedia(exercise),
    isCustom: false,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function createSeedExerciseId(sourceId: string): string {
  return DATASET_SEED_ID_PREFIX + sourceId;
}

function getExerciseType(exercise: DatasetExerciseSeed): ExerciseType {
  if (
    exercise.category === "cardio" ||
    exercise.bodyPart === "cardio" ||
    exercise.target === "cardiovascular system"
  ) {
    return "cardio";
  }

  return "reps";
}

function getEquipmentDetail(exercise: DatasetExerciseSeed, equipment: string): string {
  return equipment + ". Referencia del dataset: " + exercise.sourceName + ".";
}

function createGuide(steps: string[]): Exercise["guide"] {
  const cleanSteps = steps.map((step) => step.trim()).filter(Boolean);

  return {
    setup: cleanSteps.slice(0, 2),
    technique: cleanSteps.slice(2),
    commonMistakes: [],
  };
}

function createExerciseMedia(exercise: DatasetExerciseSeed): ExerciseMedia {
  return {
    source: DATASET_REPO,
    sourceExerciseId: exercise.sourceId,
    sourceExerciseName: exercise.sourceName,
    sourceUrl: EXERCISES_DATASET_SOURCE_URL,
    imageUrl: EXERCISES_DATASET_ASSET_BASE_URL + "/" + exercise.imagePath,
    animationUrl: EXERCISES_DATASET_ASSET_BASE_URL + "/" + exercise.animationPath,
  };
}

function translateMuscle(value: string): string {
  return muscleLabels[value] ?? value;
}

function translateEquipment(value: string): string {
  return equipmentLabels[value] ?? value;
}

function translateBodyPart(value: string): string {
  return bodyPartLabels[value] ?? value;
}

function toUniqueLabels(values: string[]): string[] {
  const labels = new Map<string, string>();

  for (const value of values) {
    const label = value.trim();
    const key = normalizeExerciseName(label);
    if (label.length > 0 && !labels.has(key)) {
      labels.set(key, label);
    }
  }

  return [...labels.values()];
}

function hasSeedExerciseMetadataChanges(
  existingExercise: Exercise,
  seedExercise: Exercise,
): boolean {
  return (
    existingExercise.name !== seedExercise.name ||
    existingExercise.type !== seedExercise.type ||
    existingExercise.weightRelevant !== seedExercise.weightRelevant ||
    existingExercise.equipmentDetail !== seedExercise.equipmentDetail ||
    !areStringArraysEqual(existingExercise.primaryMuscles, seedExercise.primaryMuscles) ||
    !areStringArraysEqual(existingExercise.secondaryMuscles, seedExercise.secondaryMuscles) ||
    !areStringArraysEqual(existingExercise.equipment, seedExercise.equipment) ||
    !areStringArraysEqual(existingExercise.tags, seedExercise.tags) ||
    !areStringArraysEqual(existingExercise.guide.setup, seedExercise.guide.setup) ||
    !areStringArraysEqual(existingExercise.guide.technique, seedExercise.guide.technique) ||
    !areStringArraysEqual(existingExercise.guide.commonMistakes, seedExercise.guide.commonMistakes) ||
    !areExerciseMediaEqual(existingExercise.media, seedExercise.media)
  );
}

function areStringArraysEqual(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((item, index) => item === second[index]);
}

function areExerciseMediaEqual(first?: ExerciseMedia, second?: ExerciseMedia): boolean {
  if (!first || !second) {
    return first === second;
  }

  return (
    first.source === second.source &&
    first.sourceExerciseId === second.sourceExerciseId &&
    first.sourceExerciseName === second.sourceExerciseName &&
    first.sourceUrl === second.sourceUrl &&
    first.imageUrl === second.imageUrl &&
    first.animationUrl === second.animationUrl
  );
}

function isConstraintError(error: unknown): boolean {
  return (
    isRecord(error) &&
    (error.name === "ConstraintError" || error.name === "BulkError")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
