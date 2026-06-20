import type { Settings } from "../domain/types";
import { toIsoUtc } from "../domain/utils";

export function createDefaultSettings(now = toIsoUtc()): Settings {
  return {
    id: "settings",
    unitSystem: "metric",
    theme: "system",
    firstDayOfWeek: 1,
    showDeleteConfirmation: true,
    exportPreferences: {
      includeArchivedExercises: true,
      includeDeletedRoutines: true,
      prettyPrint: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}
