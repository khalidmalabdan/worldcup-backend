import { Router } from "express";
import {
  getAllLeagues,
  getLeagueById,
  createLeague,
  joinLeague,
  resetWeeklyPoints,
  resetMonthlyPoints,
  paginateLeague,
} from "../models/League";

const router = Router();

// -----------------------------
// GET ALL LEAGUES
// -----------------------------
router.get("/", (_req, res) => {
  res.json(getAllLeagues());
});

// -----------------------------
// GET SINGLE LEAGUE
// -----------------------------
router.get("/:id", (req, res) => {
  const league = getLeagueById(req.params.id);
  if (!league) return res.status(404).json({ message: "League not found" });
  res.json(league);
});

// -----------------------------
// CREATE LEAGUE
// -----------------------------
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "name required" });
  const league = createLeague(name);
  res.status(201).json(league);
});

// -----------------------------
// JOIN LEAGUE
// -----------------------------
router.post("/:id/join", (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name)
    return res.status(400).json({ message: "userId and name required" });

  const member = joinLeague(req.params.id, userId, name);
  if (!member) return res.status(404).json({ message: "League not found" });

  res.json(member);
});

// -----------------------------
// ⭐ WEEKLY LEADERBOARD
// -----------------------------
router.get("/weekly/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const sorted = [...league.members].sort((a, b) => b.weeklyPoints - a.weeklyPoints);

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "weekly",
    members: sorted,
  });
});

// -----------------------------
// ⭐ MONTHLY LEADERBOARD
// -----------------------------
router.get("/monthly/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const sorted = [...league.members].sort((a, b) => b.monthlyPoints - a.monthlyPoints);

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "monthly",
    members: sorted,
  });
});

// -----------------------------
// ⭐ ALL‑TIME LEADERBOARD
// -----------------------------
router.get("/alltime/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const sorted = [...league.members].sort((a, b) => b.points - a.points);

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "alltime",
    members: sorted,
  });
});

// -----------------------------
// ⭐ USER ACHIEVEMENTS
// -----------------------------
router.get("/achievements/:userId", (req, res) => {
  const userId = req.params.userId;

  let achievements: string[] = [];
  let found = false;

  getAllLeagues().forEach((league) => {
    const member = league.members.find((m) => m.userId === userId);
    if (member) {
      achievements = member.achievements;
      found = true;
    }
  });

  if (!found) {
    return res.status(404).json({ message: "User not found in any league" });
  }

  res.json({
    userId,
    achievements,
  });
});

// -----------------------------
// ⭐ MOST IMPROVED LEADERBOARD
// -----------------------------
router.get("/most-improved/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const sorted = [...league.members].sort((a, b) => b.weeklyPoints - a.weeklyPoints);

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "most-improved",
    members: sorted,
  });
});

// -----------------------------
// ⭐ DOUBLE‑POINT LEADERBOARD
// -----------------------------
router.get("/doublepoint/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const filtered = league.members.filter((m) => m.doublePointUsed);

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "doublepoint",
    members: filtered,
  });
});

// -----------------------------
// ⭐ TIE‑BREAKER LEADERBOARD
// -----------------------------
router.get("/tiebreakers/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const sorted = [...league.members].sort((a, b) => {
    if (b.exactScores !== a.exactScores)
      return b.exactScores - a.exactScores;
    if (b.correctScorers !== a.correctScorers)
      return b.correctScorers - a.correctScorers;
    return b.correctAssists - a.correctAssists;
  });

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "tiebreakers",
    members: sorted,
  });
});

// -----------------------------
// ⭐ PAGINATED LEADERBOARD
// -----------------------------
router.get("/paginated/:leagueId", (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = paginateLeague(
    req.params.leagueId,
    Number(page),
    Number(limit)
  );

  if (!result) return res.status(404).json({ message: "League not found" });

  res.json(result);
});

// -----------------------------
// ⭐ PERFECT WEEK LEADERBOARD
// -----------------------------
router.get("/perfect-week/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const filtered = league.members.filter((m) =>
    m.achievements.includes("Perfect Week")
  );

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "perfect-week",
    members: filtered,
  });
});

// -----------------------------
// ⭐ EXACT SCORE MASTERS
// -----------------------------
router.get("/exact-score-masters/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const filtered = league.members.filter((m) =>
    m.achievements.includes("Exact Score Master")
  );

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "exact-score-masters",
    members: filtered,
  });
});

// -----------------------------
// ⭐ GOLDEN PREDICTORS
// -----------------------------
router.get("/golden-predictors/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const filtered = league.members.filter((m) =>
    m.achievements.includes("Golden Predictor")
  );

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "golden-predictors",
    members: filtered,
  });
});

// -----------------------------
// ⭐ ASSIST GENIUS
// -----------------------------
router.get("/assist-genius/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const filtered = league.members.filter((m) =>
    m.achievements.includes("Assist Genius")
  );

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "assist-genius",
    members: filtered,
  });
});

// -----------------------------
// ⭐ SCORER SPECIALISTS
// -----------------------------
router.get("/scorer-specialists/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const filtered = league.members.filter((m) =>
    m.achievements.includes("Scorer Specialist")
  );

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "scorer-specialists",
    members: filtered,
  });
});

// -----------------------------
// ⭐ HAT‑TRICK PREDICTORS
// -----------------------------
router.get("/hat-trick-predictors/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  const filtered = league.members.filter((m) =>
    m.achievements.includes("Hat‑trick Predictor")
  );

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "hat-trick-predictors",
    members: filtered,
  });
});

// -----------------------------
// ⭐ CLEAN SHEETS (prediction-based)
// -----------------------------
router.get("/clean-sheets/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  // Clean sheet = predicted opponent score = 0
  const filtered = league.members.filter((m) =>
    m.correctAssists >= 5 // placeholder metric
  );

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "clean-sheets",
    members: filtered,
  });
});

// -----------------------------
// ⭐ STREAKS (3+ correct predictions in a row)
// -----------------------------
router.get("/streaks/:leagueId", (req, res) => {
  const league = getLeagueById(req.params.leagueId);
  if (!league) return res.status(404).json({ message: "League not found" });

  // Placeholder: streak = exactScores >= 3
  const filtered = league.members.filter((m) => m.exactScores >= 3);

  res.json({
    leagueId: league.id,
    name: league.name,
    leaderboardType: "streaks",
    members: filtered,
  });
});

// -----------------------------
// RESET WEEKLY
// -----------------------------
router.post("/:id/reset-weekly", (req, res) => {
  const league = resetWeeklyPoints(req.params.id);
  if (!league) return res.status(404).json({ message: "League not found" });
  res.json({ message: "Weekly leaderboard reset", league });
});

// -----------------------------
// RESET MONTHLY
// -----------------------------
router.post("/:id/reset-monthly", (req, res) => {
  const league = resetMonthlyPoints(req.params.id);
  if (!league) return res.status(404).json({ message: "League not found" });
  res.json({ message: "Monthly leaderboard reset", league });
});

export default router;
