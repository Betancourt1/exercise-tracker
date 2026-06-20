export function createId(): string {
  return crypto.randomUUID();
}

export function toIsoUtc(date = new Date()): string {
  return date.toISOString();
}

export function normalizeExerciseName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-MX")
    .replace(/\s+/g, " ");
}
