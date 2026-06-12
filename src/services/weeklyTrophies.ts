import prisma from "../prisma";

export async function awardWeeklyTrophies(leagueId: string) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const weekEnd = new Date();

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: true },
  });

  if (!members.length) return;

  // Top scorer
  const topScorer = [...members].sort((a, b) => b.points - a.points)[0];

  // Use `as any` to bypass TS complaining about weeklyTrophy on PrismaClient
  await (prisma as any).weeklyTrophy.create({
    data: {
      leagueId,
      userId: topScorer.userId,
      weekStart,
      weekEnd,
      trophy: "top_scorer",
    },
  });

  // Most improved (requires extra fields if you want deeper logic)
}
