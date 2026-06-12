import { Router } from "express";
import requireAuth, { AuthRequest } from "../middleware/authMiddleware";
import {
  getWeeklyTrophiesByLeague,
  getWeeklyTrophiesByUser,
} from "../models/weeklyTrophy";

const router = Router();

/* ---------------------------------------------------
   ⭐ Get weekly trophies for a league
   GET /trophies/league/:leagueId
--------------------------------------------------- */
router.get(
  "/league/:leagueId",
  requireAuth,
  async (req: AuthRequest, res) => {
    const { leagueId } = req.params as { leagueId: string };

    if (!leagueId) {
      return res.status(400).json({ error: "leagueId is required" });
    }

    try {
      const trophies = await getWeeklyTrophiesByLeague(leagueId);
      res.json(trophies);
    } catch (err) {
      console.error("Error fetching league trophies:", err);
      res.status(500).json({ error: "Failed to fetch league trophies" });
    }
  }
);

/* ---------------------------------------------------
   ⭐ Get weekly trophies for current user
   GET /trophies/me
--------------------------------------------------- */
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const trophies = await getWeeklyTrophiesByUser(userId);
    res.json(trophies);
  } catch (err) {
    console.error("Error fetching user trophies:", err);
    res.status(500).json({ error: "Failed to fetch user trophies" });
  }
});

export default router;
