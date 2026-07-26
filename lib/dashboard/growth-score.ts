export interface GrowthScoreDimensionInput {
  id: string;
  label: string;
  availablePoints: number;
  earnedPoints?: number;
  explanation: string;
  improvementHref?: string;
  unavailableReason?: string;
}

export interface GrowthScoreDimension {
  id: string;
  label: string;
  availablePoints: number;
  earnedPoints: number | null;
  explanation: string;
  improvementHref?: string;
  unavailableReason?: string;
}

export interface GrowthScoreResult {
  status: "ready" | "partial" | "unavailable";
  score: number | null;
  earnedPoints: number;
  observablePoints: number;
  maximumPoints: 100;
  dimensions: GrowthScoreDimension[];
}

/**
 * Growth Score v1 normalizes only observable dimensions to 100.
 * Missing dimensions are excluded, never treated as zero. At least one
 * observable dimension is required. Inputs are clamped to their boundaries.
 */
export function calculateGrowthScore(
  inputs: GrowthScoreDimensionInput[]
): GrowthScoreResult {
  const dimensions = inputs.map((input) => {
    const availablePoints = Math.max(0, input.availablePoints);
    const earnedPoints =
      input.earnedPoints === undefined
        ? null
        : Math.min(availablePoints, Math.max(0, input.earnedPoints));
    return { ...input, availablePoints, earnedPoints };
  });

  const observable = dimensions.filter(
    (dimension) => dimension.earnedPoints !== null && dimension.availablePoints > 0
  );
  const observablePoints = observable.reduce(
    (sum, dimension) => sum + dimension.availablePoints,
    0
  );
  const earnedPoints = observable.reduce(
    (sum, dimension) => sum + (dimension.earnedPoints ?? 0),
    0
  );

  if (observablePoints === 0) {
    return {
      status: "unavailable",
      score: null,
      earnedPoints: 0,
      observablePoints: 0,
      maximumPoints: 100,
      dimensions,
    };
  }

  return {
    status: observable.length === dimensions.length ? "ready" : "partial",
    score: Math.min(100, Math.round((earnedPoints / observablePoints) * 100)),
    earnedPoints,
    observablePoints,
    maximumPoints: 100,
    dimensions,
  };
}
