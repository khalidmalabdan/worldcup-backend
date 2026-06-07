import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import {
  getMatchByExternalId,
  createMatch,
  updateMatchScore,
} from "../models/Match";
import { getPredictionsForMatch } from "../models/Predictions";
import { calculatePredictionPoints } from "./scoring";
import { recomputeLeaderboardsForMatch } from "../models/League";
import { io } from "../socket";

// ⭐ NEW — global match store for standings
export const storedMatches: any[] = [];

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const BASE_URL = "https://api.football-data.org/v4";

// Fetch ONLY World Cup matches
async function fetchWorldCupMatches() {
  console.log("🔍 Fetching matches from Football-Data API...");

  const res = await axios.get(`${BASE_URL}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": API_KEY },
  });

  console.log("✅ API responded with:", res.data.matches?.length, "matches");

  return res.data.matches;
}

export async function syncMatches() {
  console.log("🔄 Running syncMatches()...");

  const apiMatches = await fetchWorldCupMatches();

  console.log("📦 Total matches received:", apiMatches.length);

  for (const m of apiMatches) {
    // ⭐ SKIP MATCHES WITH NO DATE OR NO TEAMS
    if (!m.utcDate || !m.homeTeam?.name || !m.awayTeam?.name) {
      console.log("⏭ Skipping match with missing data:", m.id);
      continue;
    }

    const kickoff = new Date(m.utcDate).getTime();
    const existing = getMatchByExternalId(m.id);

    console.log("➡️ Processing match:", m.id, m.homeTeam.name, "vs", m.awayTeam.name);

    // ⭐ Normalized match object for standings
    const normalized = {
      id: String(m.id),
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      homeScore: m.score.fullTime.home ?? null,
      awayScore: m.score.fullTime.away ?? null,
      kickoffTime: kickoff,
      status:
        m.status === "FINISHED"
          ? "finished"
          : m.status === "IN_PLAY" || m.status === "PAUSED"
          ? "live"
          : "upcoming",
    };

    // ⭐ Update storedMatches (for standings)
    const stored = storedMatches.find((x) => x.id === normalized.id);
    if (!stored) {
      storedMatches.push({ ...normalized });
    } else {
      Object.assign(stored, normalized);
    }

    // -----------------------------
    // 1. CREATE MATCH IF NOT EXISTS
    // -----------------------------
    if (!existing) {
      console.log("🆕 Creating new match:", m.id);

      createMatch({
        externalId: m.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        kickoffTime: kickoff,

        // Logos + Flags
        homeLogo: m.homeTeam.crest,
        awayLogo: m.awayTeam.crest,
        homeFlag: m.homeTeam.area?.flag,
        awayFlag: m.awayTeam.area?.flag,

        // ⭐ NEW — initial events
        events: Array.isArray(m.goals)
          ? m.goals.map((g) => ({
              minute: g.minute,
              type: g.type,
              scorer: g.scorer?.name,
              assist: g.assist?.name,
              team: g.team?.name,
            }))
          : [],
      });

      continue;
    }

    // -----------------------------
    // 2. UPDATE LOGOS + FLAGS
    // -----------------------------
    console.log("🔄 Updating existing match:", m.id);

    existing.homeLogo = m.homeTeam.crest;
    existing.awayLogo = m.awayTeam.crest;
    existing.homeFlag = m.homeTeam.area?.flag;
    existing.awayFlag = m.awayTeam.area?.flag;

    // -----------------------------
    // 3. UPDATE MATCH EVENTS (goals + assists)
    // -----------------------------
    if (Array.isArray(m.goals)) {
      console.log("⚽ Updating match events for:", m.id);

      existing.events = m.goals.map((g) => ({
        minute: g.minute,
        type: g.type,
        scorer: g.scorer?.name,
        assist: g.assist?.name,
        team: g.team?.name,
      }));
    }

    // -----------------------------
    // 4. UPDATE LIVE SCORES
    // -----------------------------
    if (m.status === "IN_PLAY" || m.status === "PAUSED") {
      console.log("🔥 Live match detected:", m.id);

      existing.status = "live";
      existing.homeScore = m.score.fullTime.home ?? 0;
      existing.awayScore = m.score.fullTime.away ?? 0;

      io.to(`match:${existing.id}`).emit("match:update", existing);
    }

    // -----------------------------
    // 5. FINAL SCORE → TRIGGER SCORING
    // -----------------------------
    if (m.status === "FINISHED" && existing.status !== "finished") {
      console.log("🏁 Final score detected for:", m.id);

      const updated = updateMatchScore(
        existing.id,
        m.score.fullTime.home,
        m.score.fullTime.away
      );

      // Score all predictions
      const predictions = getPredictionsForMatch(updated.id);
      const scored = predictions.map((p) => ({
        ...p,
        points: calculatePredictionPoints(updated, p),
      }));

      // Broadcast final match + scored predictions + events
      io.to(`match:${updated.id}`).emit("match:final", {
        match: updated,
        predictions: scored,
        events: updated.events,
      });

      // Update league leaderboards
      const leagues = recomputeLeaderboardsForMatch(updated);
      leagues.forEach((league) => {
        io.to(`league:${league.id}`).emit("league:update", league.members);
      });
    }
  }

  console.log("✅ syncMatches() completed.");
}
