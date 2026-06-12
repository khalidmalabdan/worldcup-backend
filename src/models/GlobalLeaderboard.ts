import prisma from "../prisma";

export interface GlobalLeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string | null;
  points: number;
  rank: number;
}

/* ---------------------------------------------------
   ⭐ Global leaderboard across all leagues
--------------------------------------------------- */
export async function getGlobalLeaderboard(
  limit = 100
): Promise<GlobalLeaderboardEntry[]> {
  const members = await prisma.leagueMember.findMany({
    include: { user: true },
  });

  // Aggregate points per user
  const aggregated = new Map<
    string,
    { name: string; avatar: string | null; points: number }
  >();

  for (const m of members) {
    if (!aggregated.has(m.userId)) {
      aggregated.set(m.userId, {
        name: m.user?.name ?? "Unknown",
        avatar: m.user?.avatar ?? null,
        points: 0,
      });
    }
    aggregated.get(m.userId)!.points += m.points ?? 0;
  }

  // Sort by total points
  const sorted = [...aggregated.entries()]
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);

  // Add rank
  return sorted.map((m, index) => ({
    ...m,
    rank: index + 1,
  }));
}
