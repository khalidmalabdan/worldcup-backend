import { Prediction } from "../models/Predictions";
import { Match, MatchEvent } from "../models/Match";

// Helper: determine match outcome
function getOutcome(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

export function calculatePredictionPoints(
  match: Match,
  prediction: Prediction
): number {
  const { homeScore, awayScore, events = [] } = match;
  const {
    predictedHomeScore,
    predictedAwayScore,
    predictedScorers = [],
    predictedAssists = [],
    predictedGoalMinutes = [],   // ⭐ NEW
    doublePoint = false          // ⭐ NEW
  } = prediction;

  if (homeScore == null || awayScore == null) return 0;

  let points = 0;

  // -----------------------------
  // 1. Exact score → +10 points
  // -----------------------------
  const exactScore =
    homeScore === predictedHomeScore &&
    awayScore === predictedAwayScore;

  if (exactScore) {
    points += 10;
  } else {
    // -----------------------------
    // 2. Correct winner → +5 points
    // -----------------------------
    const actualOutcome = getOutcome(homeScore, awayScore);
    const predictedOutcome = getOutcome(predictedHomeScore, predictedAwayScore);

    if (actualOutcome === predictedOutcome) {
      points += 5;
    }
  }

  // -----------------------------
  // 3. Correct scorer → +10 each
  // -----------------------------
  const actualScorers = events
    .filter((e) => e.scorer)
    .map((e) => e.scorer);

  for (const predicted of predictedScorers) {
    if (actualScorers.includes(predicted)) {
      points += 10;
    }
  }

  // -----------------------------
  // 4. Correct assister → +10 each
  // -----------------------------
  const actualAssisters = events
    .filter((e) => e.assist)
    .map((e) => e.assist);

  for (const predicted of predictedAssists) {
    if (actualAssisters.includes(predicted)) {
      points += 10;
    }
  }

  // -----------------------------
  // 5. Goal minute prediction (±5 min) → +5 each
  // -----------------------------
  const actualMinutes = events.map((e) => e.minute);

  for (const predictedMinute of predictedGoalMinutes) {
    if (
      actualMinutes.some(
        (m) => Math.abs(m - predictedMinute) <= 5
      )
    ) {
      points += 5;
    }
  }

  // -----------------------------
  // 6. Clean sheet bonus → +5
  // -----------------------------
  const predictedCleanSheet =
    predictedHomeScore === 0 || predictedAwayScore === 0;

  const actualCleanSheet =
    homeScore === 0 || awayScore === 0;

  if (predictedCleanSheet && actualCleanSheet) {
    points += 5;
  }

  // -----------------------------
  // 7. Penalty / Own goal scoring
  // -----------------------------
  for (const e of events) {
    if (e.type === "PENALTY") {
      points += 2; // bonus for predicting a match with penalties
    }
    if (e.type === "OWN_GOAL") {
      points += 2; // bonus for predicting a match with own goals
    }
  }

  // -----------------------------
  // 8. Double‑Point (x2) multiplier
  // -----------------------------
  if (doublePoint) {
    points *= 2;
  }

  return points;
}
