import type { Settings } from "../domain/types";
import { appDb, type WorkoutDatabase } from "./db";
import { createDefaultSettings } from "./settings";

export async function getSettings(db: WorkoutDatabase = appDb): Promise<Settings> {
  return (await db.settings.get("settings")) ?? createDefaultSettings();
}

export async function ensureSettings(db: WorkoutDatabase = appDb): Promise<Settings> {
  const existing = await db.settings.get("settings");
  if (existing) {
    return existing;
  }

  const settings = createDefaultSettings();
  await db.settings.put(settings);
  return settings;
}

export async function saveSettings(
  settings: Settings,
  db: WorkoutDatabase = appDb,
): Promise<"settings"> {
  await db.settings.put(settings);
  return "settings";
}
