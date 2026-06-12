import { Router, Request, Response } from "express";
import { getGlobalLeaderboard } from "../models/GlobalLeaderboard";

const router = Router();

/* ---------------------------------------------------
   ⭐ Global leaderboard
   GET /leaderboard/global
--------------------------------------------------- */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const leaderboard = await getGlobalLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error("Error fetching global leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch global leaderboard" });
  }
});

export default router;
