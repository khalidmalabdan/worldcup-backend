import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

// ROUTES
import authRoutes from "./routes/auth";
import leaderboardRoutes from "./routes/leaderboard";
import leagueRoutes from "./routes/leagues";
import matchRoutes from "./routes/matches";
import predictionRoutes from "./routes/predictions";
import usersRoutes from "./routes/users";

// ⭐ NEW ROUTES
import trophiesRoutes from "./routes/trophies";
import globalLeaderboardRoutes from "./routes/globalLeaderboard";
import leagueAdminRoutes from "./routes/leagueAdmin";
import badgesRoutes from "./routes/badges";
import matchTimelineRoutes from "./routes/matchTimeline";

// Football-Data sync service
import { syncMatches } from "./services/footballData";

// Standings engine
import { computeStandings } from "./utils/standings";

// Prisma client
import prisma from "./prisma";
import { setupSocket } from "./socket";

// League scoring engine
import { updateAllLeaguePoints } from "./services/leagueScoringService";

async function getAllMatches() {
  return prisma.match.findMany({
    include: {
      predictions: true, // required for standings
    },
  });
}

const app = express();
const server = http.createServer(app);

setupSocket(server);

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ success: true, message: "World Cup backend is running" });
});

/* ---------------------------------------------------
   REGISTER ROUTES
--------------------------------------------------- */
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/leagues", leagueRoutes);
app.use("/matches", matchRoutes);
app.use("/predictions", predictionRoutes);
app.use("/leaderboard", leaderboardRoutes);

// ⭐ NEW ROUTES
app.use("/trophies", trophiesRoutes);
app.use("/leaderboard/global", globalLeaderboardRoutes);
app.use("/league-admin", leagueAdminRoutes);
app.use("/badges", badgesRoutes);
app.use("/matches", matchTimelineRoutes);

/* ---------------------------------------------------
   SOCKET.IO
--------------------------------------------------- */

/* ---------------------------------------------------
   STANDINGS ENDPOINT
--------------------------------------------------- */
app.get("/standings", async (_req, res) => {
  try {
    const matches = await getAllMatches();
    const standings = computeStandings(matches);
    res.json({ groups: standings });
  } catch (err) {
    console.error("❌ Error computing standings:", err);
    res.status(500).json({ error: "Failed to compute standings" });
  }
});

/* ---------------------------------------------------
   SMART SYNC LOOP
--------------------------------------------------- */
async function hasLiveMatches() {
  const matches = await getAllMatches();
  return matches.some((m) => m.status === "live");
}

async function smartSyncLoop() {
  console.log("🔄 Running scheduled sync...");

  // 1. Sync matches from Football-Data API
  await syncMatches();

  // 2. Recalculate league points + emit live updates
  await updateAllLeaguePoints();

  // 3. Adjust sync interval based on live matches
  const live = await hasLiveMatches();
  const nextInterval = live ? 60_000 : 600_000;

  console.log(
    live
      ? "⚽ Live match detected → syncing again in 1 minute"
      : "⏳ No live matches → syncing again in 10 minutes"
  );

  setTimeout(smartSyncLoop, nextInterval);
}

/* ---------------------------------------------------
   SERVER START + INITIAL SYNC
--------------------------------------------------- */
server.listen(3001, async () => {
  console.log("Server running on port 3001");
  console.log("🔄 Initial sync starting...");

  await syncMatches();
  await updateAllLeaguePoints();

  console.log("⏱ Starting smart sync loop...");
  smartSyncLoop();
});
