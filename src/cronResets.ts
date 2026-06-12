import { 
  getAllLeagues, 
  resetWeeklyPoints, 
  resetMonthlyPoints 
} from "./models/Leaderboard";

import { logReset } from "./services/resetLogger";

console.log("⏳ Reset worker started...");

async function run() {
  try {
    // FIX: Await the Promise
    const leagues = await getAllLeagues();

    const now = new Date();
    const isSunday = now.getDay() === 0;
    const isFirstOfMonth = now.getDate() === 1;

    // ⭐ WEEKLY RESET (Sunday)
    if (isSunday) {
      console.log("🔄 Weekly reset triggered...");
      leagues.forEach((l) => resetWeeklyPoints(l.id));

      logReset("weekly", "Automatic weekly reset completed");
    }

    // ⭐ MONTHLY RESET (1st of month)
    if (isFirstOfMonth) {
      console.log("🔄 Monthly reset triggered...");
      leagues.forEach((l) => resetMonthlyPoints(l.id));

      logReset("monthly", "Automatic monthly reset completed");
    }

    console.log("✅ Reset worker completed.");
  } catch (err) {
    console.error("❌ Reset worker failed:", err);
    logReset("weekly", "Reset worker encountered an error");
  }
}

run();
