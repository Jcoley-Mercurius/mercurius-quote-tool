import { describe, expect, it } from "vitest";
import { calculateGrowthScore } from "./growth-score";

describe("calculateGrowthScore", () => {
  it("calculates a fully available score", () => {
    const result = calculateGrowthScore([
      { id: "a", label: "A", availablePoints: 40, earnedPoints: 20, explanation: "" },
      { id: "b", label: "B", availablePoints: 60, earnedPoints: 45, explanation: "" },
    ]);
    expect(result).toMatchObject({ status: "ready", score: 65, maximumPoints: 100 });
  });

  it("normalizes partial data without treating missing dimensions as zero", () => {
    const result = calculateGrowthScore([
      { id: "known", label: "Known", availablePoints: 25, earnedPoints: 20, explanation: "" },
      { id: "missing", label: "Missing", availablePoints: 75, explanation: "" },
    ]);
    expect(result).toMatchObject({
      status: "partial",
      score: 80,
      earnedPoints: 20,
      observablePoints: 25,
    });
    expect(result.dimensions[1].earnedPoints).toBeNull();
  });

  it("returns unavailable when there is no observable data", () => {
    expect(
      calculateGrowthScore([
        { id: "a", label: "A", availablePoints: 100, explanation: "" },
      ])
    ).toMatchObject({ status: "unavailable", score: null });
  });

  it("clamps boundary values and never exceeds 100", () => {
    const result = calculateGrowthScore([
      { id: "high", label: "High", availablePoints: 60, earnedPoints: 500, explanation: "" },
      { id: "low", label: "Low", availablePoints: 40, earnedPoints: -20, explanation: "" },
    ]);
    expect(result.score).toBe(60);
    expect(result.dimensions.map((item) => item.earnedPoints)).toEqual([60, 0]);
  });
});
