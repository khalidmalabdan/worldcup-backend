import { Router, Request, Response } from "express";

const router = Router();

/* ---------------------------------------------------
   ⭐ Badge metadata
   GET /badges
--------------------------------------------------- */
router.get("/", (_req: Request, res: Response) => {
  const badges = [
    {
      key: "🔥 High Roller",
      icon: "🔥",
      description: "Reached 100+ points in a league.",
    },
    {
      key: "🎯 Exact Score Master",
      icon: "🎯",
      description: "Got 5 or more exact score predictions correct.",
    },
    {
      key: "⚽ Scorer Specialist",
      icon: "⚽",
      description: "Predicted 10 or more correct scorers.",
    },
  ];

  res.json(badges);
});

export default router;
