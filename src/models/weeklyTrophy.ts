import prisma from "../prisma";

export interface WeeklyTrophyModel {
  id: string;
  leagueId: string;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  trophy: string;
  createdAt: Date;
}

/* ---------------------------------------------------
   ⭐ Get trophies for a league
--------------------------------------------------- */
export async function getWeeklyTrophiesByLeague(
  leagueId: string
): Promise<WeeklyTrophyModel[]> {
  const trophies = await (prisma as any).weeklyTrophy.findMany({
    where: { leagueId },
    include: { user: true, league: true },
    orderBy: { createdAt: "desc" },
  });

  return trophies;
}

/* ---------------------------------------------------
   ⭐ Get trophies for a user
--------------------------------------------------- */
export async function getWeeklyTrophiesByUser(
  userId: string
): Promise<WeeklyTrophyModel[]> {
  const trophies = await (prisma as any).weeklyTrophy.findMany({
    where: { userId },
    include: { user: true, league: true },
    orderBy: { createdAt: "desc" },
  });

  return trophies;
}
