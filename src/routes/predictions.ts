import { Router } from "express";
import requireAuth, { AuthRequest } from "../middleware/authMiddleware";

import { getMatchById } from "../models/Match";
import {
  upsertPrediction,
  getPredictionsByMatch,
} from "../models/Predictions";

import {
  canUseDoublePoint,
  recordDoublePointUse,
  getRemainingDoublePoints,
} from "../services/doublePointTracker";

import { calculatePredictionPoints } from "../services/scoring";
import { io } from "../socket";

const router = Router();

/* ---------------------------------------------------
   ⭐ GET REMAINING DOUBLE POINT USES
--------------------------------------------------- */
router.get("/doublepoint/remaining", requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const remaining = getRemainingDoublePoints(userId);

  res.json({
    userId,
    remaining,
    totalAllowed: 2,
  });
});

/* ---------------------------------------------------
   ⭐ GET USER PREDICTION FOR A MATCH
--------------------------------------------------- */
router.get("/:matchId", requireAuth, async (req: AuthRequest, res) => {
  const matchId =
    typeof req.params.matchId === "string"
      ? req.params.matchId
      : req.params.matchId[0];

  const userId = req.user!.id;

  const match = await getMatchById(matchId);
  if (!match) return res.status(404).json({ message: "Match not found" });

  const predictions = await getPredictionsByMatch(matchId);
  const prediction = predictions.find((p) => p.userId === userId);

  res.json(prediction || null);
});

/* ---------------------------------------------------
   ⭐ CREATE OR UPDATE PREDICTION
--------------------------------------------------- */
router.post("/:matchId", requireAuth, async (req: AuthRequest, res) => {
  const matchId =
    typeof req.params.matchId === "string"
      ? req.params.matchId
      : req.params.matchId[0];

  const userId = req.user!.id;

  const {
    homeScore,
    awayScore,
    scorers = [],
    assisters = [],
    goalMinutes = [],
    doublePoint = false,
  } = req.body;

  const match = await getMatchById(matchId);
  if (!match) return res.status(404).json({ message: "Match not found" });

  // Cannot predict finished matches
  if (match.status === "finished") {
    return res.status(400).json({ error: "Match already finished" });
  }

  /* ---------------------------------------------------
     ⭐ DOUBLE POINT LIMIT CHECK
  --------------------------------------------------- */
  if (doublePoint) {
    if (!canUseDoublePoint(userId)) {
      return res.status(400).json({
        error: "You can only use Double Point twice per week.",
      });
    }
    recordDoublePointUse(userId);
  }

  /* ---------------------------------------------------
     ⭐ UPSERT PREDICTION
  --------------------------------------------------- */
  const saved = await upsertPrediction({
    userId,
    matchId,
    homeScore: Number(homeScore),
    awayScore: Number(awayScore),
    scorers: Array.isArray(scorers) ? scorers : [],
    assisters: Array.isArray(assisters) ? assisters : [],
    goalMinutes: Array.isArray(goalMinutes)
      ? goalMinutes.map((n: any) => Number(n))
      : [],
    doublePoint,
  });

  /* ---------------------------------------------------
     ⭐ IF MATCH IS FINISHED → SCORE IMMEDIATELY
  --------------------------------------------------- */
  let points: number | null = null;

  if (match.status === "finished") {
    points = calculatePredictionPoints(match, saved);
  }

  /* ---------------------------------------------------
     ⭐ SOCKET EMIT
  --------------------------------------------------- */
  io.to(`match:${matchId}`).emit("prediction:update", {
    ...saved,
    points,
  });

  res.status(201).json({
    ...saved,
    points,
  });
});

export default router;
