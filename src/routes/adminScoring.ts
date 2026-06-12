import { Router } from "express";
import requireAuth, { AuthRequest } from "../middleware/authMiddleware";

import { getMatchById } from "../models/Match";
import {
  getPredictionsByMatch,
  updatePredictionPoints,
} from "../models/Predictions";

import {
  scoreMatchById,
  scoreFinishedMatches,
  rescoreMatch,
  rescoreAllMatches,
} from "../services/scoringEngine";

const router = Router();

/* ---------------------------------------------------
   ⭐ Helper to normalize route params to string
--------------------------------------------------- */
function asString(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param;
}

/* ---------------------------------------------------
   ⭐ Override points for a single user in a match
--------------------------------------------------- */
router.post(
  "/override/:matchId/:userId",
  requireAuth,
  async (req: AuthRequest, res) => {
    const matchId = asString(req.params.matchId);
    const userId = asString(req.params.userId);
    const { points } = req.body;

    const match = await getMatchById(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const predictions = await getPredictionsByMatch(matchId);
    const prediction = predictions.find((p) => p.userId === userId);

    if (!prediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }

    await updatePredictionPoints(prediction.id, points);

    return res.json({
      message: "Points overridden successfully",
      matchId,
      userId,
      newPoints: points,
    });
  }
);

/* ---------------------------------------------------
   ⭐ Trigger scoring for a single match
--------------------------------------------------- */
router.post(
  "/score/:matchId",
  requireAuth,
  async (req: AuthRequest, res) => {
    const matchId = asString(req.params.matchId);

    const match = await getMatchById(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    await scoreMatchById(matchId);

    return res.json({
      message: "Scoring executed for match",
      matchId,
    });
  }
);

/* ---------------------------------------------------
   ⭐ Trigger scoring for ALL finished matches
--------------------------------------------------- */
router.post("/score-all", requireAuth, async (req: AuthRequest, res) => {
  await scoreFinishedMatches();

  return res.json({
    message: "Scoring executed for all finished matches",
  });
});

/* ---------------------------------------------------
   ⭐ Re-score a single match (clear + recalc)
--------------------------------------------------- */
router.post(
  "/rescore/:matchId",
  requireAuth,
  async (req: AuthRequest, res) => {
    const matchId = asString(req.params.matchId);

    const match = await getMatchById(matchId);
    if (!match) return res.status(404).json({ error: "Match not found" });

    await rescoreMatch(matchId);

    return res.json({
      message: "Match re-scored successfully",
      matchId,
    });
  }
);

/* ---------------------------------------------------
   ⭐ Re-score ALL finished matches
--------------------------------------------------- */
router.post("/rescore-all", requireAuth, async (req: AuthRequest, res) => {
  await rescoreAllMatches();

  return res.json({
    message: "All finished matches re-scored successfully",
  });
});

export default router;
