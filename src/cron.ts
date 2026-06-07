import dotenv from "dotenv";
dotenv.config();

import { syncMatches } from "./services/footballData";

console.log("⏳ Cron worker started. Running sync every 5 minutes...");

async function run() {
  try {
    console.log("🔄 Running scheduled sync...");
    await syncMatches();
    console.log("✅ Sync completed.");
  } catch (err) {
    console.error("❌ Sync failed:", err);
  }
}

// Run immediately on startup
run();

// Run every 5 minutes
setInterval(run, 30 * 60 * 1000);
