import { Router } from "express";
import { updateMatchScore, getMatchById } from "../models/Match";
import { recomputeLeaderboardsForMatch } from "../models/League";
import { getPredictionsForMatch } from "../models/Predictions";
import { calculatePredictionPoints } from "../services/scoring";
import { io } from "../socket";

const router = Router();

// TODO: add real auth / admin check
router.post("/matches/:id/score", (req, res) => {
  const { id } = req.params;
  const { homeScore, awayScore } = req.body;

  // 1. Update match result
  const match = updateMatchScore(id, homeScore, awayScore);
  if (!match) return res.status(404).json({ message: "Match not found" });

  // 2. Score all predictions for this match
  const predictions = getPredictionsForMatch(match.id);
  const scoredPredictions = predictions.map((p) => {
    const points = calculatePredictionPoints(match, p);
    return { ...p, points };
  });

  // 3. Broadcast match final result
  io.to(`match:${match.id}`).emit("match:final", {
    match,
    predictions: scoredPredictions,
  });

  // 4. Recompute league leaderboards
  const leagues = recomputeLeaderboardsForMatch(match);
  leagues.forEach((league) => {
    io.to(`league:${league.id}`).emit("league:update", league.members);
  });

  res.json({
    match,
    predictions: scoredPredictions,
  });
});

export default router;
