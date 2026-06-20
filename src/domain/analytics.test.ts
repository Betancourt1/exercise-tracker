import { describe, expect, it } from "vitest";
import {
  calculateAdherence,
  calculateEstimatedOneRepMax,
  calculatePrsByExercise,
  calculateSessionVolume,
  calculateSetVolume,
} from "./analytics";

describe("analytics helpers", () => {
  it("calculates set volume only for completed valid sets", () => {
    expect(calculateSetVolume({ completed: true, weightKg: 100, reps: 5 })).toBe(500);
    expect(calculateSetVolume({ completed: false, weightKg: 100, reps: 5 })).toBe(0);
    expect(calculateSetVolume({ completed: true, weightKg: null, reps: 5 })).toBe(0);
    expect(calculateSetVolume({ completed: true, weightKg: 100, reps: 0 })).toBe(0);
    expect(calculateSetVolume({ completed: true, weightKg: -10, reps: 5 })).toBe(0);
  });

  it("sums session volume from completed sets", () => {
    expect(
      calculateSessionVolume([
        { completed: true, weightKg: 100, reps: 5 },
        { completed: true, weightKg: 80, reps: 8 },
        { completed: false, weightKg: 120, reps: 3 },
      ]),
    ).toBe(1140);
  });

  it("calculates estimated 1RM with Epley for completed sets in the valid rep range", () => {
    expect(calculateEstimatedOneRepMax({ completed: true, weightKg: 100, reps: 6 })).toBe(120);
    expect(calculateEstimatedOneRepMax({ completed: false, weightKg: 100, reps: 6 })).toBeNull();
    expect(calculateEstimatedOneRepMax({ completed: true, weightKg: 100, reps: 13 })).toBeNull();
    expect(calculateEstimatedOneRepMax({ completed: true, weightKg: 0, reps: 6 })).toBeNull();
  });

  it("finds PRs per exercise from historical completed sets", () => {
    const prs = calculatePrsByExercise([
      {
        id: "set-1",
        exerciseId: "sentadilla",
        exerciseNameSnapshot: "Sentadilla",
        completed: true,
        completedAt: "2026-01-01T00:00:00.000Z",
        weightKg: 100,
        reps: 5,
      },
      {
        id: "set-2",
        exerciseId: "sentadilla",
        exerciseNameSnapshot: "Sentadilla",
        completed: true,
        completedAt: "2026-01-02T00:00:00.000Z",
        weightKg: 105,
        reps: 5,
      },
      {
        id: "set-3",
        exerciseId: "press-banca",
        exerciseNameSnapshot: "Press banca",
        completed: false,
        completedAt: "2026-01-03T00:00:00.000Z",
        weightKg: 80,
        reps: 5,
      },
    ]);

    expect(prs.sentadilla?.exerciseId).toBe("sentadilla");
    expect(prs.sentadilla?.setLogId).toBe("set-2");
    expect(prs.sentadilla?.estimatedOneRepMax).toBeCloseTo(122.5);
    expect(prs["press-banca"]).toBeUndefined();
  });

  it("returns adherence percentage capped at 100 and null when nothing was planned", () => {
    expect(calculateAdherence(3, 4)).toEqual({
      planned: 4,
      completed: 3,
      percentage: 75,
    });
    expect(calculateAdherence(6, 4)).toEqual({
      planned: 4,
      completed: 6,
      percentage: 100,
    });
    expect(calculateAdherence(0, 0)).toBeNull();
    expect(calculateAdherence(1, Number.NaN)).toBeNull();
  });
});
