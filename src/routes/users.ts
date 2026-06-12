import { Router } from "express";
import requireAuth, { AuthRequest } from "../middleware/authMiddleware";

import { getUserById } from "../models/User";
import { getAllLeagues } from "../models/Leaderboard";
import { getAllMatches } from "../models/Match";
import { getPredictionsByMatch } from "../models/Predictions";

const router = Router();

/* ---------------------------------------------------
   ⭐ GET USER BY ID (legacy)
--------------------------------------------------- */
router.get("/:id", async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

/* ---------------------------------------------------
   ⭐ /users/me — Profile + Leagues + Stats
--------------------------------------------------- */
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const user = await getUserById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const leagues = (await getAllLeagues())
    .filter((league) => league.members.some((m) => m.userId === userId))
    .map((league) => {
      const member = league.members.find((m) => m.userId === userId);
      return {
        id: league.id,
        name: league.name,
        rank: member?.rank ?? null,
        points: member?.points ?? 0,
      };
    });

  const matches = await getAllMatches();

  const predictions: any[] = [];
  let totalPoints = 0;
  let exactScores = 0;
  let correctScorers = 0;
  let correctAssists = 0;

  for (const match of matches) {
    const preds = await getPredictionsByMatch(match.id);
    const p = preds.find((x) => x.userId === userId);
    if (!p) continue;

    predictions.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      doublePoint: p.doublePoint ?? false,
      points: p.points ?? 0,
    });

    if (match.status === "finished") {
      totalPoints += p.points ?? 0;

      if (p.homeScore === match.homeScore && p.awayScore === match.awayScore) {
        exactScores++;
      }

      correctScorers += p.scorers?.length ?? 0;
      correctAssists += p.assisters?.length ?? 0;
    }
  }

  res.json({
    id: user.id,
    name: user.name,
    avatar: user.avatar ?? null,
    leagues,
    predictions,
    stats: {
      totalPoints,
      exactScores,
      correctScorers,
      correctAssists,
    },
  });
});

/* ---------------------------------------------------
   ⭐ /users/me/history — Points earned per match
--------------------------------------------------- */
router.get("/me/history", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const matches = await getAllMatches();
  const history = [];

  for (const match of matches) {
    const preds = await getPredictionsByMatch(match.id);
    const p = preds.find((x) => x.userId === userId);

    history.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      finalScore: {
        home: match.homeScore,
        away: match.awayScore,
      },
      prediction: p
        ? {
            homeScore: p.homeScore,
            awayScore: p.awayScore,
            doublePoint: p.doublePoint ?? false,
            points: p.points ?? 0,
          }
        : null,
    });
  }

  res.json(history);
});

/* ---------------------------------------------------
   ⭐ /users/me/achievements — Badges & Milestones
--------------------------------------------------- */
router.get("/me/achievements", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const matches = await getAllMatches();

  let totalPoints = 0;
  let exactScores = 0;
  let correctScorers = 0;
  let correctAssists = 0;

  for (const match of matches) {
    const preds = await getPredictionsByMatch(match.id);
    const p = preds.find((x) => x.userId === userId);
    if (!p || match.status !== "finished") continue;

    totalPoints += p.points ?? 0;

    if (p.homeScore === match.homeScore && p.awayScore === match.awayScore) {
      exactScores++;
    }

    correctScorers += p.scorers?.length ?? 0;
    correctAssists += p.assisters?.length ?? 0;
  }

  const achievements: string[] = [];

  if (exactScores >= 5) achievements.push("Exact Score Master");
  if (totalPoints >= 100) achievements.push("Golden Predictor");
  if (correctScorers >= 10) achievements.push("Scorer Specialist");
  if (correctAssists >= 10) achievements.push("Assist Genius");

  res.json({
    achievements,
    stats: {
      totalPoints,
      exactScores,
      correctScorers,
      correctAssists,
    },
  });
});

/* ---------------------------------------------------
   ⭐ /users/me/compare/:otherUserId
--------------------------------------------------- */
router.get("/me/compare/:otherUserId", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const otherId =
    typeof req.params.otherUserId === "string"
      ? req.params.otherUserId
      : req.params.otherUserId[0];

  const userA = await getUserById(userId);
  const userB = await getUserById(otherId);

  if (!userA || !userB) {
    return res.status(404).json({ error: "One or both users not found" });
  }

  const matches = await getAllMatches();

  async function computeStats(uid: string) {
    let totalPoints = 0;
    let exactScores = 0;
    let scorers = 0;
    let assists = 0;

    for (const match of matches) {
      const preds = await getPredictionsByMatch(match.id);
      const p = preds.find((x) => x.userId === uid);
      if (!p || match.status !== "finished") continue;

      totalPoints += p.points ?? 0;

      if (p.homeScore === match.homeScore && p.awayScore === match.awayScore) {
        exactScores++;
      }

      scorers += p.scorers?.length ?? 0;
      assists += p.assisters?.length ?? 0;
    }

    return { totalPoints, exactScores, scorers, assists };
  }

  const statsA = await computeStats(userId);
  const statsB = await computeStats(otherId);

  res.json({
    userA: { id: userA.id, name: userA.name, stats: statsA },
    userB: { id: userB.id, name: userB.name, stats: statsB },
  });
});

/* ---------------------------------------------------
   ⭐ /users/me/weekly — Points per month
--------------------------------------------------- */
router.get("/me/weekly", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const matches = await getAllMatches();

  const weekly: Record<string, number> = {};

  for (const match of matches) {
    const preds = await getPredictionsByMatch(match.id);
    const p = preds.find((x) => x.userId === userId);
    if (!p || match.status !== "finished") continue;

    const pts = p.points ?? 0;

    const week = new Date(match.kickoffTime)
      .toISOString()
      .slice(0, 7); // YYYY-MM

    if (!weekly[week]) weekly[week] = 0;
    weekly[week] += pts;
  }

  const bestWeek = Object.values(weekly).length
    ? Math.max(...Object.values(weekly))
    : 0;

  res.json({
    weekly,
    bestWeek,
    trend: Object.entries(weekly).map(([week, points]) => ({
      week,
      points,
    })),
  });
});

/* ---------------------------------------------------
   ⭐ /users/me/badges
--------------------------------------------------- */
router.get("/me/badges", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const matches = await getAllMatches();

  let totalPoints = 0;
  let exactScores = 0;
  let scorers = 0;
  let assists = 0;

  for (const match of matches) {
    const preds = await getPredictionsByMatch(match.id);
    const p = preds.find((x) => x.userId === userId);
    if (!p || match.status !== "finished") continue;

    const pts = p.points ?? 0;

    totalPoints += pts;

    if (p.homeScore === match.homeScore && p.awayScore === match.awayScore) {
      exactScores++;
    }

    scorers += p.scorers?.length ?? 0;
    assists += p.assisters?.length ?? 0;
  }

  const badges = [
    {
      id: "exact-master",
      title: "Exact Score Master",
      description: "Get 5 exact score predictions.",
      icon: "target",
      earned: exactScores >= 5,
      progress: Math.min((exactScores / 5) * 100, 100),
    },
    {
      id: "golden-predictor",
      title: "Golden Predictor",
      description: "Score 100 total points.",
      icon: "trophy",
      earned: totalPoints >= 100,
      progress: Math.min((totalPoints / 100) * 100, 100),
    },
    {
      id: "scorer-specialist",
      title: "Scorer Specialist",
      description: "Correctly predict 10 scorers.",
      icon: "shoe",
      earned: scorers >= 10,
      progress: Math.min((scorers / 10) * 100, 100),
    },
    {
      id: "assist-genius",
      title: "Assist Genius",
      description: "Correctly predict 10 assists.",
      icon: "sparkles",
      earned: assists >= 10,
      progress: Math.min((assists / 10) * 100, 100),
    },
  ];

  res.json({ badges });
});

export default router;
