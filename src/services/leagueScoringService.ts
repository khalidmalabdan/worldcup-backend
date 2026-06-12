import prisma from "../prisma";
import { io } from "../socket";

/* ---------------------------------------------------
   Sync Prediction Points → League Points
--------------------------------------------------- */
export async function updateLeaguePointsForUser(userId: string) {
  // Sum all prediction points for this user
  const agg = await prisma.prediction.aggregate({
    where: { userId },
    _sum: { points: true },
  });

  const total = agg._sum.points || 0;

  // Update all league memberships for this user
  await prisma.leagueMember.updateMany({
    where: { userId },
    data: { points: total },
  });

  // Find all leagues this user belongs to
  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    select: { leagueId: true },
  });

  // Emit live leaderboard updates for each league
  for (const m of memberships) {
    io.to(`league:${m.leagueId}`).emit("league:leaderboardUpdated", {
      leagueId: m.leagueId,
    });
  }
}

/* ---------------------------------------------------
   Sync All Users (for cron / smart sync loop)
--------------------------------------------------- */
export async function updateAllLeaguePoints() {
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const u of users) {
    await updateLeaguePointsForUser(u.id);
  }
}
