import { Router } from "express";
import { getAllMatches, getMatchById } from "../models/Match";
import { getPredictionsByMatch } from "../models/Predictions";

import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const router = Router();

/* ---------------------------------------------------
   ⭐ Extract userId from Authorization header
--------------------------------------------------- */
function getUserIdFromAuthHeader(req: AuthRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------
   ⭐ GET ALL MATCHES
--------------------------------------------------- */
router.get("/", async (_req, res) => {
  const matches = await getAllMatches();
  res.json(matches);
});

async function getTodaysMatches(req: AuthRequest) {
  const allMatches = await getAllMatches();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStart = today.getTime();
  const tomorrowStart = tomorrow.getTime();

  const userId = getUserIdFromAuthHeader(req);

  const todaysMatches = [];

  for (const match of allMatches) {
    const kickoff = Number(match.kickoffTime);

    if (!(kickoff >= todayStart && kickoff < tomorrowStart)) continue;

    const now = Date.now();
    let status: "upcoming" | "live" | "finished" = "upcoming";

    if (match.status === "finished") status = "finished";
    else if (now >= kickoff) status = "live";

    // Personalized prediction
    let userPrediction = null;
    if (userId) {
      const preds = await getPredictionsByMatch(match.id);
      userPrediction = preds.find((p) => p.userId === userId) || null;
    }

    const homePlayers = Array.isArray(match.homePlayers)
      ? match.homePlayers
      : [];

    const awayPlayers = Array.isArray(match.awayPlayers)
      ? match.awayPlayers
      : [];

    todaysMatches.push({
      id: match.id,
      kickoff,
      status,
      score: {
        home: match.homeScore,
        away: match.awayScore,
      },
      homeTeam: {
        name: match.homeTeam,
        logo: match.homeLogo || `/flags/${match.homeTeam}.png`,
        players: homePlayers.map((p: string) => ({
          name: p,
          team: match.homeTeam,
        })),
      },
      awayTeam: {
        name: match.awayTeam,
        logo: match.awayLogo || `/flags/${match.awayTeam}.png`,
        players: awayPlayers.map((p: string) => ({
          name: p,
          team: match.awayTeam,
        })),
      },
      userPrediction,
    });
  }

  todaysMatches.sort((a, b) => a.kickoff - b.kickoff);
  return todaysMatches;
}

router.get("/day/today", async (req: AuthRequest, res) => {
  const todaysMatches = await getTodaysMatches(req);
  res.json(todaysMatches);
});

router.get("/today", async (req: AuthRequest, res) => {
  const todaysMatches = await getTodaysMatches(req);
  res.json(todaysMatches);
});

/* ---------------------------------------------------
   ⭐ MATCH DETAILS
--------------------------------------------------- */
router.get("/:id/details", async (req: AuthRequest, res) => {
  const matchId =
    typeof req.params.id === "string" ? req.params.id : req.params.id[0];

  const match = await getMatchById(matchId);
  if (!match) return res.status(404).json({ message: "Match not found" });

  const userId = getUserIdFromAuthHeader(req);

  const kickoff = Number(match.kickoffTime);

  let minute: number | null = null;
  if (match.status === "live") {
    const now = Date.now();
    const diff = Math.floor((now - kickoff) / 60000);
    minute = diff > 0 ? diff : 1;
  }

  const timeline = Array.isArray(match.events)
    ? [...match.events].sort((a, b) => a.minute - b.minute)
    : [];

  const predictions = await getPredictionsByMatch(matchId);

  const userPrediction = userId
    ? predictions.find((p) => p.userId === userId) || null
    : null;

  const homePlayers = Array.isArray(match.homePlayers)
    ? match.homePlayers
    : [];

  const awayPlayers = Array.isArray(match.awayPlayers)
    ? match.awayPlayers
    : [];

  res.json({
    id: match.id,
    kickoffTime: kickoff,
    status: match.status,
    minute,

    homeTeam: {
      name: match.homeTeam,
      logo: match.homeLogo,
      flag: match.homeFlag,
      players: homePlayers,
    },

    awayTeam: {
      name: match.awayTeam,
      logo: match.awayLogo,
      flag: match.awayFlag,
      players: awayPlayers,
    },

    score: {
      home: match.homeScore,
      away: match.awayScore,
    },

    events: timeline,
    predictions,
    userPrediction,
  });
});

/* ---------------------------------------------------
   ⭐ SIMPLE MATCH BY ID
--------------------------------------------------- */
router.get("/:id", async (req, res) => {
  const matchId =
    typeof req.params.id === "string" ? req.params.id : req.params.id[0];

  const match = await getMatchById(matchId);
  if (!match) return res.status(404).json({ message: "Match not found" });

  res.json(match);
});

export default router;
