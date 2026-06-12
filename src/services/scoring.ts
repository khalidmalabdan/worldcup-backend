// ---------------------------------------------------
// ⭐ Local lightweight types (aligned with PredictionModel)
// ---------------------------------------------------
export interface ScoringMatchEvent {
  scorer?: string;
  assist?: string;
  minute: number;
  type?: string; // "PENALTY", "OWN_GOAL", etc.
}

export interface ScoringMatch {
  homeScore: number | null;
  awayScore: number | null;
  events?: ScoringMatchEvent[];
}

export interface ScoringPrediction {
  homeScore: number;
  awayScore: number;
  scorers?: string[];
  assisters?: string[];
  goalMinutes?: number[];
  doublePoint?: boolean;
}

// ---------------------------------------------------
// ⭐ Helper: determine match outcome
// ---------------------------------------------------
function getOutcome(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

// ---------------------------------------------------
// ⭐ Main scoring function
// ---------------------------------------------------
export function calculatePredictionPoints(
  match: ScoringMatch,
  prediction: ScoringPrediction
): number {
  const { homeScore, awayScore, events = [] } = match;
  const {
    homeScore: predictedHomeScore,
    awayScore: predictedAwayScore,
    scorers = [],
    assisters = [],
    goalMinutes = [],
    doublePoint = false,
  } = prediction;

  if (homeScore == null || awayScore == null) return 0;

  let points = 0;

  // 1. Exact score → +10
  const exactScore =
    homeScore === predictedHomeScore &&
    awayScore === predictedAwayScore;

  if (exactScore) {
    points += 10;
  } else {
    // 2. Correct winner → +5
    const actualOutcome = getOutcome(homeScore, awayScore);
    const predictedOutcome = getOutcome(predictedHomeScore, predictedAwayScore);

    if (actualOutcome === predictedOutcome) {
      points += 5;
    }
  }

  // 3. Correct scorer → +10 each
  const actualScorers = events.filter(e => e.scorer).map(e => e.scorer!);

  for (const predicted of scorers) {
    if (actualScorers.includes(predicted)) {
      points += 10;
    }
  }

  // 4. Correct assister → +10 each
  const actualAssisters = events.filter(e => e.assist).map(e => e.assist!);

  for (const predicted of assisters) {
    if (actualAssisters.includes(predicted)) {
      points += 10;
    }
  }

  // 5. Goal minute prediction (±5 min) → +5 each
  const actualMinutes = events.map(e => e.minute);

  for (const predictedMinute of goalMinutes) {
    if (actualMinutes.some(m => Math.abs(m - predictedMinute) <= 5)) {
      points += 5;
    }
  }

  // 6. Clean sheet bonus → +5
  const predictedCleanSheet =
    predictedHomeScore === 0 || predictedAwayScore === 0;

  const actualCleanSheet =
    homeScore === 0 || awayScore === 0;

  if (predictedCleanSheet && actualCleanSheet) {
    points += 5;
  }

  // 7. Penalty / Own goal → +2 each
  for (const e of events) {
    if (e.type === "PENALTY") points += 2;
    if (e.type === "OWN_GOAL") points += 2;
  }

  // 8. Double‑Point (x2)
  if (doublePoint) {
    points *= 2;
  }

  return points;
}
