import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

// ROUTES (correct paths)
import authRoutes from "./routes/auth";
import leagueRoutes from "./routes/leagues";
import matchRoutes from "./routes/matches";
import predictionRoutes from "./routes/predictions";

// Football-Data sync service (correct path)
import { syncMatches } from "./services/footballData";

// Standings engine (correct path)
import { computeStandings } from "./utils/standings";

// Match store (correct path)
import { getAllMatches } from "./services/matches";

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// -----------------------------
// REGISTER ROUTES
// -----------------------------
app.use("/auth", authRoutes);
app.use("/leagues", leagueRoutes);
app.use("/matches", matchRoutes);
app.use("/predictions", predictionRoutes);

// -----------------------------
// SOCKET.IO
// -----------------------------
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// -----------------------------
// STANDINGS ENDPOINT
// -----------------------------
app.get("/standings", async (req, res) => {
  try {
    const matches = await getAllMatches(); // must return Match[]
    const standings = computeStandings(matches);
    res.json({ groups: standings });
  } catch (err) {
    console.error("❌ Error computing standings:", err);
    res.status(500).json({ error: "Failed to compute standings" });
  }
});

// -----------------------------
// SERVER START + INITIAL SYNC
// -----------------------------
server.listen(3001, () => {
  console.log("Server running on port 3001");
  console.log("🔄 Initial sync starting...");
  syncMatches();
});

// -----------------------------
// AUTOMATED SYNC EVERY 30 SECONDS
// -----------------------------
setInterval(() => {
  console.log("⏱ Running scheduled sync...");
  syncMatches();
}, 30_000);
