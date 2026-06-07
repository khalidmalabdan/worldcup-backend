import { Router } from "express";
import {
  createPrediction,
  getPrediction,
  updatePrediction,
} from "../models/Predictions";
import { getMatchById } from "../models/Match";
import { io } from "../socket";

// ⭐ NEW — Double Point weekly limit tracker
import {
  canUseDoublePoint,
  recordDoublePointUse,
  getRemainingDoublePoints,
} from "../services/doublePointTracker";

const router = Router();

// ⭐ NEW — Get remaining Double Point uses for this week
router.get("/doublepoint/remaining/:userId", (req, res) => {
  const { userId } = req.params;

  const remaining = getRemainingDoublePoints(userId);

  res.json({
    userId,
    remaining,
    totalAllowed: 2,
    message: `Double Point remaining: ${remaining} / 2`,
  });
});

// GET my prediction for a match
router.get("/:matchId/:userId", (req, res) => {
  const { matchId, userId } = req.params;
  const prediction = getPrediction(userId, matchId);
  res.json(prediction || null);
});

// CREATE or UPDATE prediction
router.post("/:matchId", (req, res) => {
  const { matchId } = req.params;
  const {
    userId,
    predictedHomeScore,
    predictedAwayScore,
    predictedScorers,
    predictedAssists,
    predictedGoalMinutes,
    doublePoint, // ⭐ NEW
  } = req.body;

  const match = getMatchById(matchId);
  if (!match) return res.status(404).json({ message: "Match not found" });

  // ⭐ Double Point weekly limit check
  if (doublePoint) {
    if (!canUseDoublePoint(userId)) {
      return res.status(400).json({
        error: "You can only use Double Point twice per week.",
      });
    }

    // Record usage for this week
    recordDoublePointUse(userId);
  }

  const existing = getPrediction(userId, matchId);

  if (existing) {
    const updated = updatePrediction(userId, matchId, {
      predictedHomeScore,
      predictedAwayScore,
      predictedScorers,
      predictedAssists,
      predictedGoalMinutes, // ⭐ NEW
      doublePoint,          // ⭐ NEW
    });

    io.to(`match:${matchId}`).emit("prediction:update", updated);
    return res.json(updated);
  }

  const newPrediction = createPrediction({
    userId,
    matchId,
    predictedHomeScore,
    predictedAwayScore,
    predictedScorers,
    predictedAssists,
    predictedGoalMinutes, // ⭐ NEW
    doublePoint,          // ⭐ NEW
  });

  io.to(`match:${matchId}`).emit("prediction:new", newPrediction);
  res.status(201).json(newPrediction);
});

export default router;
