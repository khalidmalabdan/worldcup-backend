import { Router } from "express";
import { getAllMatches, getMatchById } from "../models/Match";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getAllMatches());
});

router.get("/:id", (req, res) => {
  const match = getMatchById(req.params.id);
  if (!match) return res.status(404).json({ message: "Match not found" });
  res.json(match);
});

export default router;
