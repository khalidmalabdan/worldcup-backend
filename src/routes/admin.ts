import { Router } from "express";
import { updateMatchScore } from "../models/Match";
import { 
  recomputeLeaderboardsForMatch, 
  getAllLeagues, 
  resetWeeklyPoints, 
  resetMonthlyPoints 
} from "../models/Leaderboard";
import { getPredictionsForMatch } from "../models/Predictions";
import { calculatePredictionPoints } from "../services/scoring";
import { io } from "../socket";

// ⭐ Reset logs
import { logReset, getResetLogs } from "../services/resetLogger";

// ⭐ Manual match sync
import { syncMatches } from "../services/footballData";

const router = Router();

// ⭐ Simple admin key (replace later with real auth)
const ADMIN_KEY = process.env.ADMIN_KEY;

// Middleware: protect admin routes
router.use((req, res, next) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
});

/* ---------------------------------------------------
   ⭐ MANUAL MATCH SCORE UPDATE
--------------------------------------------------- */
router.post("/matches/:id/score", async (req, res) => {
  const { id } = req.params;
  const { homeScore, awayScore } = req.body;

  const match = await updateMatchScore(id, homeScore, awayScore);
  if (!match) return res.status(404).json({ message: "Match not found" });

  const predictions = await getPredictionsForMatch(match.id);

  const scoredPredictions = predictions.map((p) => ({
    ...p,
    points: calculatePredictionPoints(match, p),
  }));

  io.to(`match:${match.id}`).emit("match:final", {
    match,
    predictions: scoredPredictions,
  });

  const leagues = await recomputeLeaderboardsForMatch(match);

  leagues.forEach((league) => {
    io.to(`league:${league.id}`).emit("league:update", league.members);
  });

  res.json({ match, predictions: scoredPredictions });
});

/* ---------------------------------------------------
   ⭐ MANUAL WEEKLY RESET
--------------------------------------------------- */
router.post("/reset-weekly", async (req, res) => {
  const leagues = await getAllLeagues();

  for (const l of leagues) {
    await resetWeeklyPoints(l.id);
  }

  logReset("weekly", "Manual weekly reset triggered by admin");

  res.json({ message: "Weekly reset completed" });
});

/* ---------------------------------------------------
   ⭐ MANUAL MONTHLY RESET
--------------------------------------------------- */
router.post("/reset-monthly", async (req, res) => {
  const leagues = await getAllLeagues();

  for (const l of leagues) {
    await resetMonthlyPoints(l.id);
  }

  logReset("monthly", "Manual monthly reset triggered by admin");

  res.json({ message: "Monthly reset completed" });
});

/* ---------------------------------------------------
   ⭐ RESET LOG VIEWER
--------------------------------------------------- */
router.get("/reset-logs", (req, res) => {
  res.json(getResetLogs());
});

/* ---------------------------------------------------
   ⭐ MANUAL MATCH SYNC
--------------------------------------------------- */
router.post("/sync", async (req, res) => {
  await syncMatches();
  res.json({ message: "Match sync completed" });
});

export default router;
