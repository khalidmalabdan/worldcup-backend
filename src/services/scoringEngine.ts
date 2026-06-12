import {
  getFinishedMatches,
  getMatchById,
  markMatchAsScored,
  clearMatchScoredFlag,
} from "../models/Match";

import {
  getPredictionsByMatch,
  updatePredictionPoints,
} from "../models/Predictions";

import { calculatePredictionPoints } from "../services/scoring";

/* ---------------------------------------------------
   ⭐ MAIN ENGINE — Score all finished matches
--------------------------------------------------- */
export async function scoreFinishedMatches() {
  console.log("🧮 Starting scoring engine...");

  const matches = await getFinishedMatches();

  for (const match of matches) {
    if (match.scored) {
      console.log(`⏭ Match ${match.id} already scored, skipping`);
      continue;
    }

    console.log(`⚽ Scoring predictions for match ${match.id}`);

    const predictions = await getPredictionsByMatch(match.id);

    for (const prediction of predictions) {
      if (prediction.points != null) continue;

      const points = calculatePredictionPoints(match, prediction);
      await updatePredictionPoints(prediction.id, points);

      console.log(`   → Prediction ${prediction.id} scored ${points} points`);
    }

    await markMatchAsScored(match.id);
  }

  console.log("✅ Scoring engine completed.");
}

/* ---------------------------------------------------
   ⭐ SCORE A SINGLE MATCH (used by admin + cron)
--------------------------------------------------- */
export async function scoreMatchById(matchId: string) {
  const match = await getMatchById(matchId);
  if (!match) return;

  if (match.status !== "finished") {
    console.log(`⏭ Match ${matchId} not finished, skipping`);
    return;
  }

  if (match.scored) {
    console.log(`⏭ Match ${matchId} already scored, skipping`);
    return;
  }

  console.log(`⚽ Scoring match ${matchId}`);

  const predictions = await getPredictionsByMatch(matchId);

  for (const prediction of predictions) {
    if (prediction.points != null) continue;

    const points = calculatePredictionPoints(match, prediction);
    await updatePredictionPoints(prediction.id, points);

    console.log(`   → Prediction ${prediction.id} scored ${points} points`);
  }

  await markMatchAsScored(matchId);

  console.log(`✅ Match ${matchId} scored successfully`);
}

/* ---------------------------------------------------
   ⭐ FORCE RE-SCORE (admin override)
   - Clears points
   - Recalculates everything
--------------------------------------------------- */
export async function rescoreMatch(matchId: string) {
  const match = await getMatchById(matchId);
  if (!match) return;

  console.log(`🔄 Re-scoring match ${matchId}`);

  const predictions = await getPredictionsByMatch(matchId);

  // Clear old points
  for (const prediction of predictions) {
    await updatePredictionPoints(prediction.id, null);
  }

  // Reset match flag
  await clearMatchScoredFlag(matchId);

  // Re-run scoring
  await scoreMatchById(matchId);

  console.log(`✅ Match ${matchId} re-scored successfully`);
}

/* ---------------------------------------------------
   ⭐ FORCE RE-SCORE ALL MATCHES (admin override)
--------------------------------------------------- */
export async function rescoreAllMatches() {
  console.log("🔄 Re-scoring ALL finished matches...");

  const matches = await getFinishedMatches();

  for (const match of matches) {
    await rescoreMatch(match.id);
  }

  console.log("✅ All matches re-scored successfully");
}
