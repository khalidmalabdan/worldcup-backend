import pkg from "uuid";
const { v4: uuid } = pkg;

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;

  predictedHomeScore: number;
  predictedAwayScore: number;

  // Multiple scorers + assisters
  predictedScorers: string[];
  predictedAssists: string[];

  // ⭐ NEW — goal minute predictions (for ±5 min bonus)
  predictedGoalMinutes?: number[];

  // ⭐ NEW — Double Point (x2 multiplier)
  // This is NOT related to captains — user manually activates it.
  doublePoint?: boolean;

  // Optional — store computed points
  points?: number;
}

const predictions: Prediction[] = [];

// -----------------------------
// CREATE PREDICTION
// -----------------------------
export function createPrediction(data: Omit<Prediction, "id">) {
  const prediction: Prediction = { id: uuid(), ...data };
  predictions.push(prediction);
  return prediction;
}

// -----------------------------
// GET SINGLE PREDICTION
// -----------------------------
export function getPrediction(userId: string, matchId: string) {
  return predictions.find(
    (p) => p.userId === userId && p.matchId === matchId
  );
}

// -----------------------------
// GET ALL PREDICTIONS FOR MATCH
// -----------------------------
export function getPredictionsForMatch(matchId: string) {
  return predictions.filter((p) => p.matchId === matchId);
}

// -----------------------------
// UPDATE PREDICTION
// -----------------------------
export function updatePrediction(
  userId: string,
  matchId: string,
  update: Partial<Prediction>
) {
  const prediction = getPrediction(userId, matchId);
  if (!prediction) return null;

  Object.assign(prediction, update);
  return prediction;
}
