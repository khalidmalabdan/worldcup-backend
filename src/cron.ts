import dotenv from "dotenv";
dotenv.config();

import { syncMatches } from "./services/footballData";
import { scoreFinishedMatches } from "./services/scoringEngine";

console.log("⏳ Cron worker started (one‑shot mode)...");

async function run() {
  try {
    console.log("🔄 Running scheduled sync...");
    await syncMatches();

    console.log("🧮 Running scoring engine...");
    await scoreFinishedMatches();

    console.log("✅ Cron cycle completed.");
  } catch (err) {
    console.error("❌ Cron failed:", err);
  }
}

run();
