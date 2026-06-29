import type { Exercise, Routine, RoutineDay, RoutineExercise, RoutineRevision } from "../../domain";
import { createId, normalizeExerciseName, toIsoUtc } from "../../domain";
import { ROUTINE_DAY_OPTIONS } from "./routineBuilders";

export type RoutinePreset = {
  id: string;
  name: string;
  goal: string;
  summary: string;
  daysPerWeek: number;
  duration: string;
  equipment: string;
  progression: string;
  days: RoutinePresetDay[];
};

type RoutinePresetDay = {
  dayIndex: number;
  focus: string;
  exercises: RoutinePresetExercise[];
};

type RoutinePresetExercise = {
  exerciseName: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRir: number | null;
  restSeconds: number;
  notes?: string;
};

export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: "preset:gym-base-full-body",
    name: "Base gimnasio",
    goal: "Fuerza general",
    summary: "Tres días de básicos con barra y accesorios mínimos.",
    daysPerWeek: 3,
    duration: "45-60 min",
    equipment: "barra, rack, banca",
    progression: "Cuando completes el rango alto con RIR objetivo, sube poco peso.",
    days: [
      {
        dayIndex: 0,
        focus: "Día A",
        exercises: [
          target("barbell full squat", 3, 6, 8, 2, 150),
          target("barbell bench press", 3, 6, 8, 2, 150),
          target("barbell bent over row", 3, 8, 10, 2, 120),
        ],
      },
      {
        dayIndex: 2,
        focus: "Día B",
        exercises: [
          target("barbell romanian deadlift", 3, 8, 10, 2, 150),
          target("barbell standing wide military press", 3, 6, 8, 2, 150),
          target("dumbbell lunge", 3, 8, 10, 2, 90, "Por lado."),
        ],
      },
      {
        dayIndex: 4,
        focus: "Día A ligero",
        exercises: [
          target("dumbbell goblet squat", 3, 8, 12, 2, 120),
          target("barbell bench press", 3, 8, 10, 2, 120),
          target("dumbbell bent over row", 3, 10, 12, 2, 90, "Por lado."),
        ],
      },
    ],
  },
  {
    id: "preset:no-machines-starter",
    name: "Sin máquinas inicial",
    goal: "Hábito y fuerza base",
    summary: "Dos días con peso corporal y equipo opcional.",
    daysPerWeek: 2,
    duration: "25-40 min",
    equipment: "peso corporal, barra baja opcional",
    progression: "Primero suma repeticiones limpias; después usa una variante más difícil.",
    days: [
      {
        dayIndex: 0,
        focus: "Empuje y core",
        exercises: [
          target("jump squat", 3, 10, 15, 3, 60),
          target("push-up", 3, 6, 12, 3, 75, "Inclina manos si necesitas regresión."),
          target("low glute bridge on floor", 3, 10, 15, 2, 60),
          target("front plank with twist", 3, 20, 45, null, 45),
        ],
      },
      {
        dayIndex: 3,
        focus: "Pierna y tirón",
        exercises: [
          target("dumbbell lunge", 3, 8, 10, 2, 75, "Por lado."),
          target("inverted row", 3, 8, 12, 3, 75),
          target("barbell romanian deadlift", 3, 10, 12, 2, 75, "Usa carga ligera si entrenas en casa."),
          target("dead bug", 3, 8, 12, null, 45, "Por lado."),
        ],
      },
    ],
  },
  {
    id: "preset:functional-circuit",
    name: "Circuito funcional",
    goal: "Condición y control",
    summary: "Movimientos completos con descansos cortos y cargas moderadas.",
    daysPerWeek: 3,
    duration: "30-45 min",
    equipment: "mancuernas, kettlebell o polea/banda",
    progression: "Completa rondas con técnica limpia antes de sumar carga.",
    days: [
      {
        dayIndex: 0,
        focus: "Circuito completo",
        exercises: [
          target("dumbbell step-up", 3, 10, 10, 3, 45, "Por lado."),
          target("barbell romanian deadlift", 3, 10, 12, 2, 45),
          target("barbell standing wide military press", 3, 8, 10, 2, 45),
          target("dumbbell bent over row", 3, 10, 12, 2, 45, "Por lado."),
          target("farmers walk", 3, 30, 45, null, 60),
        ],
      },
      {
        dayIndex: 2,
        focus: "Unilateral y core",
        exercises: [
          target("dumbbell lunge", 3, 10, 12, 3, 45, "Por lado."),
          target("dumbbell goblet squat", 3, 10, 12, 2, 45),
          target("band horizontal pallof press", 3, 10, 12, null, 45, "Por lado."),
          target("front plank with twist", 3, 30, 45, null, 45),
        ],
      },
      {
        dayIndex: 4,
        focus: "Bisagra y carga",
        exercises: [
          target("kettlebell swing", 3, 12, 15, 3, 60),
          target("push-up", 3, 8, 12, 3, 45),
          target("dumbbell bent over row", 3, 10, 12, 2, 45, "Por lado."),
          target("farmers walk", 3, 30, 45, null, 60, "Registra segundos como repeticiones."),
        ],
      },
    ],
  },
  {
    id: "preset:gym-hypertrophy-upper-lower",
    name: "Hipertrofia upper/lower",
    goal: "Ganancia muscular",
    summary: "Cuatro días con volumen moderado y ejercicios estables.",
    daysPerWeek: 4,
    duration: "50-70 min",
    equipment: "gimnasio completo",
    progression: "Suma reps dentro del rango y luego sube carga manteniendo 1-2 RIR.",
    days: [
      {
        dayIndex: 0,
        focus: "Upper A",
        exercises: [
          target("barbell bench press", 3, 8, 10, 2, 120),
          target("barbell bent over row", 3, 8, 10, 2, 120),
          target("barbell standing wide military press", 3, 8, 10, 2, 90),
          target("cable lat pulldown full range of motion", 3, 10, 12, 2, 90),
        ],
      },
      {
        dayIndex: 1,
        focus: "Lower A",
        exercises: [
          target("barbell full squat", 3, 8, 10, 2, 150),
          target("barbell romanian deadlift", 3, 8, 10, 2, 120),
          target("dumbbell lunge", 3, 10, 12, 2, 90, "Por lado."),
          target("dumbbell standing calf raise", 3, 12, 15, 2, 60),
        ],
      },
      {
        dayIndex: 3,
        focus: "Upper B",
        exercises: [
          target("dumbbell incline bench press", 3, 8, 12, 2, 120),
          target("cable seated row", 3, 10, 12, 2, 90),
          target("dumbbell lateral raise", 3, 12, 15, 2, 60),
          target("dumbbell biceps curl", 3, 10, 12, 2, 60),
          target("cable triceps pushdown (v-bar)", 3, 10, 12, 2, 60),
        ],
      },
      {
        dayIndex: 4,
        focus: "Lower B",
        exercises: [
          target("sled 45° leg press (side pov)", 3, 10, 12, 2, 120),
          target("barbell glute bridge two legs on bench (male)", 3, 8, 12, 2, 120),
          target("lever seated leg curl", 3, 10, 12, 2, 90),
          target("lever leg extension", 3, 12, 15, 2, 75),
        ],
      },
    ],
  },
];

export function buildRoutineGraphFromPreset(
  preset: RoutinePreset,
  exercises: Exercise[],
  manualOrder: number,
  createdAt = toIsoUtc(),
): {
  routine: Routine;
  routineDays: RoutineDay[];
  routineExercises: RoutineExercise[];
  routineRevision: RoutineRevision;
} {
  const exerciseByName = new Map(
    exercises.map((exercise) => [normalizeExerciseName(exercise.name), exercise]),
  );
  const routineId = createId();
  const routine: Routine = {
    id: routineId,
    name: preset.name,
    goal: preset.goal,
    status: "active",
    manualOrder,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    previousStatus: null,
  };
  const routineDays: RoutineDay[] = preset.days.map((day, index) => {
    const option = ROUTINE_DAY_OPTIONS[day.dayIndex];

    return {
      id: createId(),
      routineId,
      label: option.label,
      weekday: option.weekday,
      sortOrder: index + 1,
      isActive: true,
    };
  });
  const routineExercises = preset.days.flatMap((day, dayIndex) =>
    day.exercises.map((exerciseInput, exerciseIndex) => {
      const exercise = exerciseByName.get(normalizeExerciseName(exerciseInput.exerciseName));

      if (!exercise) {
        throw new Error(`Missing seeded exercise: ${exerciseInput.exerciseName}`);
      }

      return {
        id: createId(),
        routineDayId: routineDays[dayIndex].id,
        exerciseId: exercise.id,
        sortOrder: exerciseIndex + 1,
        targetSets: exerciseInput.targetSets,
        targetRepsMin: exerciseInput.targetRepsMin,
        targetRepsMax: exerciseInput.targetRepsMax,
        targetRir: exerciseInput.targetRir,
        restSeconds: exerciseInput.restSeconds,
        notes: [day.focus, exerciseInput.notes].filter(Boolean).join(" · "),
      };
    }),
  );
  const routineRevision: RoutineRevision = {
    id: createId(),
    routineId,
    revisionNumber: 1,
    effectiveFrom: createdAt,
    effectiveTo: null,
    snapshot: {
      routine,
      routineDays,
      routineExercises,
    },
  };

  return {
    routine,
    routineDays,
    routineExercises,
    routineRevision,
  };
}

function target(
  exerciseName: string,
  targetSets: number,
  targetRepsMin: number,
  targetRepsMax: number,
  targetRir: number | null,
  restSeconds: number,
  notes?: string,
): RoutinePresetExercise {
  return {
    exerciseName,
    targetSets,
    targetRepsMin,
    targetRepsMax,
    targetRir,
    restSeconds,
    notes,
  };
}
