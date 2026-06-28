export type IsoUtcString = string;

export type RoutineStatus = "draft" | "active" | "paused" | "deleted";
export type WorkoutSessionStatus = "in_progress" | "completed" | "discarded";
export type WorkoutSessionSource = "routine" | "manual";
export type UnitSystem = "metric" | "imperial";
export type ThemePreference = "system" | "light" | "dark";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ExerciseGuide = {
  technique: string[];
  setup: string[];
  commonMistakes: string[];
};

export type ExerciseMedia = {
  source: "hasaneyldrm/exercises-dataset";
  sourceExerciseId: string;
  sourceExerciseName: string;
  sourceUrl: string;
  imageUrl: string;
  animationUrl: string;
};

export type ExerciseType = "reps" | "duration" | "cardio";

export type Exercise = {
  id: string;
  name: string;
  nameNormalized: string;
  type: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  equipmentDetail?: string;
  tags: string[];
  guide: ExerciseGuide;
  media?: ExerciseMedia;
  isCustom: boolean;
  archivedAt: IsoUtcString | null;
  createdAt: IsoUtcString;
  updatedAt: IsoUtcString;
  weightRelevant?: boolean;
};

export type Routine = {
  id: string;
  name: string;
  goal: string;
  status: RoutineStatus;
  manualOrder: number;
  createdAt: IsoUtcString;
  updatedAt: IsoUtcString;
  deletedAt: IsoUtcString | null;
  previousStatus: Exclude<RoutineStatus, "deleted"> | null;
};

export type RoutineDay = {
  id: string;
  routineId: string;
  label: string;
  weekday: Weekday | null;
  sortOrder: number;
  isActive: boolean;
};

export type RoutineExercise = {
  id: string;
  routineDayId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRir: number | null;
  restSeconds: number;
  notes: string;
  targetWeightKg?: number | null;
};

export type RoutineRevisionSnapshot = {
  routine: Routine;
  routineDays: RoutineDay[];
  routineExercises: RoutineExercise[];
};

export type RoutineRevision = {
  id: string;
  routineId: string;
  revisionNumber: number;
  effectiveFrom: IsoUtcString;
  effectiveTo: IsoUtcString | null;
  snapshot: RoutineRevisionSnapshot;
};

export type ExerciseGuideSnapshot = Pick<
  Exercise,
  "id" | "name" | "equipmentDetail" | "guide" | "type" | "weightRelevant" | "media"
> & {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
};

export type RoutineExerciseTargetSnapshot = Pick<
  RoutineExercise,
  | "sortOrder"
  | "targetSets"
  | "targetRepsMin"
  | "targetRepsMax"
  | "targetRir"
  | "restSeconds"
  | "targetWeightKg"
>;

export type WorkoutSession = {
  id: string;
  status: WorkoutSessionStatus;
  source: WorkoutSessionSource;
  routineId: string | null;
  routineRevisionId: string | null;
  routineNameSnapshot: string | null;
  routineDayLabelSnapshot: string | null;
  startedAt: IsoUtcString;
  endedAt: IsoUtcString | null;
  durationSeconds: number;
  pausedSeconds: number;
  notes: string;
  createdAt: IsoUtcString;
  updatedAt: IsoUtcString;
  completedSetCount: number;
  volumeKg: number;
  prCount: number;
};

export type SetLog = {
  id: string;
  sessionId: string;
  exerciseId: string;
  routineExerciseId: string | null;
  exerciseNameSnapshot: string;
  guideSnapshot: ExerciseGuideSnapshot | null;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  completed: boolean;
  completedAt: IsoUtcString | null;
  targetSnapshot: RoutineExerciseTargetSnapshot | null;
  notes: string;
};

export type ExportPreferences = {
  includeArchivedExercises: boolean;
  includeDeletedRoutines: boolean;
  prettyPrint: boolean;
};

export type Settings = {
  id: "settings";
  unitSystem: UnitSystem;
  theme: ThemePreference;
  firstDayOfWeek: Weekday;
  showDeleteConfirmation: boolean;
  exportPreferences: ExportPreferences;
  createdAt: IsoUtcString;
  updatedAt: IsoUtcString;
};

export type AppMetaRecord = {
  id: string;
  schemaVersion: number;
  createdAt: IsoUtcString;
  updatedAt: IsoUtcString;
  value?: unknown;
};
