import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import fs from "fs";
import path from "path";

import {
  getMatchByExternalId,
  createMatch,
  updateMatchScore,
} from "../models/Match";

import { getPredictionsByMatch } from "../models/Predictions";
import { calculatePredictionPoints } from "./scoring";
import { recomputeLeaderboardsForMatch } from "../models/Leaderboard";
import { io } from "../socket";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const BASE_URL = "https://api.football-data.org/v4";

const CACHE_PATH = path.join(__dirname, "../../data/matches.json");

/* ---------------------------------------------------
   ⭐ Read cache
--------------------------------------------------- */
function readCache() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/* ---------------------------------------------------
   ⭐ Write cache
--------------------------------------------------- */
function writeCache(matches: any[]) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(matches, null, 2));
}

/* ---------------------------------------------------
   ⭐ Retry wrapper (403 + 429)
--------------------------------------------------- */
async function fetchWithRetry(url: string, retries = 3, delay = 2000) {
  try {
    return await axios.get(`${BASE_URL}${url}`, {
      headers: { "X-Auth-Token": API_KEY },
    });
  } catch (err: any) {
    const status = err.response?.status;

    if ((status === 429 || status === 403) && retries > 0) {
      console.log(`⚠️ Rate limit or block. Retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
      return fetchWithRetry(url, retries - 1, delay * 2);
    }

    throw err;
  }
}

/* ---------------------------------------------------
   ⭐ Fetch World Cup matches (with caching)
--------------------------------------------------- */
async function fetchWorldCupMatches() {
  console.log("🔍 Fetching matches from Football-Data API...");

  try {
    const res = await fetchWithRetry("/competitions/WC/matches");
    console.log("✅ API responded with:", res.data.matches?.length, "matches");

    writeCache(res.data.matches);
    return res.data.matches;
  } catch {
    console.log("⚠️ API unavailable. Loading matches from cache...");
    const cached = readCache();

    if (!cached.length) {
      console.log("❌ No cached matches available.");
      return [];
    }

    return cached;
  }
}

/* ---------------------------------------------------
   ⭐ MAIN SYNC FUNCTION
--------------------------------------------------- */
export async function syncMatches() {
  console.log("🔄 Running syncMatches()...");

  const apiMatches = await fetchWorldCupMatches();
  if (!apiMatches.length) {
    console.log("❌ No matches to sync.");
    return;
  }

  console.log("📦 Total matches received:", apiMatches.length);

  for (const m of apiMatches) {
    if (!m.utcDate || !m.homeTeam?.name || !m.awayTeam?.name) {
      console.log("⏭ Skipping match with missing data:", m.id);
      continue;
    }

    const kickoff = new Date(m.utcDate).getTime();
    const existing = await getMatchByExternalId(m.id);

    console.log("➡️ Processing match:", m.id, m.homeTeam.name, "vs", m.awayTeam.name);

    const status =
      m.status === "FINISHED"
        ? "finished"
        : m.status === "IN_PLAY" || m.status === "PAUSED"
        ? "live"
        : "upcoming";

    const events = Array.isArray(m.goals)
      ? m.goals.map((g) => ({
          minute: g.minute,
          type: g.type,
          scorer: g.scorer?.name,
          assist: g.assist?.name,
          team: g.team?.name,
        }))
      : [];

    /* ---------------------------------------------------
       ⭐ 1. CREATE MATCH IF NOT EXISTS
    --------------------------------------------------- */
    if (!existing) {
      console.log("🆕 Creating new match:", m.id);

      await createMatch({
        externalId: m.id,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        kickoffTime: kickoff,

        homeLogo: m.homeTeam.crest,
        awayLogo: m.awayTeam.crest,
        homeFlag: m.homeTeam.area?.flag,
        awayFlag: m.awayTeam.area?.flag,

        homePlayers: [],
        awayPlayers: [],
        events,
      });

      continue;
    }

    /* ---------------------------------------------------
       ⭐ 2. UPDATE LIVE MATCHES
    --------------------------------------------------- */
    if (status === "live") {
      const updated = await updateMatchScore(
        existing.id,
        m.score.fullTime.home ?? 0,
        m.score.fullTime.away ?? 0
      );

      io.to(`match:${existing.id}`).emit("match:update", updated);
      continue;
    }

    /* ---------------------------------------------------
       ⭐ 3. FINAL SCORE → SCORING
    --------------------------------------------------- */
    if (status === "finished" && existing.status !== "finished") {
      const updated = await updateMatchScore(
        existing.id,
        m.score.fullTime.home,
        m.score.fullTime.away
      );

      const predictions = await getPredictionsByMatch(updated.id);

      const scored = predictions.map((p) => ({
        ...p,
        points: calculatePredictionPoints(updated, p),
      }));

      io.to(`match:${updated.id}`).emit("match:final", {
        match: updated,
        predictions: scored,
        events,
      });

      const leagues = await recomputeLeaderboardsForMatch(updated);
      leagues.forEach((league) => {
        io.to(`league:${league.id}`).emit("league:update", league.members);
      });

      continue;
    }
  }

  console.log("✅ syncMatches() completed.");
}
