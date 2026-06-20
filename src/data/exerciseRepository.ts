import type { Exercise } from "../domain/types";
import { toIsoUtc } from "../domain/utils";
import { appDb, type WorkoutDatabase } from "./db";

export async function listExercises(db: WorkoutDatabase = appDb): Promise<Exercise[]> {
  return db.exercises.orderBy("nameNormalized").toArray();
}

export async function listAvailableExercises(
  db: WorkoutDatabase = appDb,
): Promise<Exercise[]> {
  const exercises = await db.exercises.orderBy("nameNormalized").toArray();
  return exercises.filter((exercise) => exercise.archivedAt === null);
}

export async function getExercise(
  id: string,
  db: WorkoutDatabase = appDb,
): Promise<Exercise | undefined> {
  return db.exercises.get(id);
}

export async function saveExercise(
  exercise: Exercise,
  db: WorkoutDatabase = appDb,
): Promise<string> {
  return db.exercises.put(exercise);
}

export async function archiveExercise(
  id: string,
  archivedAt = toIsoUtc(),
  db: WorkoutDatabase = appDb,
): Promise<number> {
  return db.exercises.update(id, {
    archivedAt,
    updatedAt: archivedAt,
  });
}

export async function deleteExercise(
  id: string,
  db: WorkoutDatabase = appDb,
): Promise<void> {
  await db.exercises.delete(id);
}
