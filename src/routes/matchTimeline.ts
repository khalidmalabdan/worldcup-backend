import { Router, Request, Response } from "express";
import prisma from "../prisma";

const router = Router();

/* ---------------------------------------------------
   ⭐ Match event timeline
   GET /matches/:matchId/timeline
--------------------------------------------------- */
router.get("/:matchId/timeline", async (req: Request, res: Response) => {
  const { matchId } = req.params as { matchId: string };

  if (!matchId) {
    return res.status(400).json({ error: "matchId is required" });
  }

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    let events: any[] = [];

    try {
      events = match.events ? JSON.parse(match.events) : [];
    } catch (parseErr) {
      console.error("Failed to parse match events JSON:", parseErr);
      events = [];
    }

    res.json({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      events,
    });
  } catch (err) {
    console.error("Error fetching match timeline:", err);
    res.status(500).json({ error: "Failed to fetch match timeline" });
  }
});

export default router;
