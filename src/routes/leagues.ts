import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";

import {
  createLeagueHandler,
  joinLeagueHandler,
  leagueLeaderboardHandler,
  regenerateLeagueCodeHandler,
  leaveLeagueHandler,
} from "../controllers/leagueController";

import prisma from "../prisma";

const router = Router();

/* ---------------------------------------------------
   Create + Join
--------------------------------------------------- */
router.post("/", authMiddleware, createLeagueHandler);
router.post("/join", authMiddleware, joinLeagueHandler);

/* ---------------------------------------------------
   League Info (for League Page)
   GET /leagues/:id
--------------------------------------------------- */
router.get("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    res.json(league);
  } catch (err) {
    console.error("Error fetching league:", err);
    res.status(500).json({ error: "Failed to fetch league" });
  }
});

/* ---------------------------------------------------
   Members List
   GET /leagues/:id/members
--------------------------------------------------- */
router.get("/:id/members", authMiddleware, async (req, res) => {
  const { id } = req.params as { id: string };

  try {
    const members = await prisma.leagueMember.findMany({
      where: { leagueId: id },
      include: { user: true },
      orderBy: { points: "desc" },
    });

    res.json(members);
  } catch (err) {
    console.error("Error fetching league members:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

/* ---------------------------------------------------
   Leaderboard
   GET /leagues/:id/leaderboard
--------------------------------------------------- */
router.get("/:id/leaderboard", authMiddleware, leagueLeaderboardHandler);

/* ---------------------------------------------------
   League Settings (non-admin)
--------------------------------------------------- */
router.post(
  "/settings/regenerate-code",
  authMiddleware,
  regenerateLeagueCodeHandler
);
router.post("/settings/leave", authMiddleware, leaveLeagueHandler);

/* ---------------------------------------------------
   EXPORT DEFAULT
--------------------------------------------------- */
export default router;
