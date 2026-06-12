import { Router } from "express";
import { getLeaderboardByLeagueId } from "../models/Leaderboard";

const router = Router();

// Get leaderboard for a league
router.get("/:leagueId", async (req, res) => {
  const { leagueId } = req.params;

  const leaderboard = await getLeaderboardByLeagueId(leagueId);
  if (!leaderboard) {
    return res.status(404).json({ message: "League not found" });
  }

  res.json(leaderboard.members);
});

export default router;
