import prisma from "../prisma";
import { getPredictionsByMatch, PredictionModel } from "./Predictions";
import { calculatePredictionPoints } from "../services/scoring";
import { MatchModel } from "./Match";

// ⭐ Cache utilities
import {
  cacheGet,
  cacheSet,
  cacheClearPrefix,
} from "../services/cache";

export interface LeagueMember {
  userId: string;
  name: string;
  points: number;
  role?: string;
  rank?: number;
  badges?: string[];
}

export interface League {
  id: string;
  name: string;
  logo?: string | null;
  isPrivate?: boolean;
  members: LeagueMember[];
}

/* ---------------------------------------------------
   ⭐ Helper: generate league code
--------------------------------------------------- */
function generateLeagueCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ---------------------------------------------------
   ⭐ Compute badges
--------------------------------------------------- */
function computeBadges(member: any): string[] {
  const badges: string[] = [];

  if (member.points >= 100) badges.push("🔥 High Roller");
  if (member.exactScores >= 5) badges.push("🎯 Exact Score Master");
  if (member.correctScorers >= 10) badges.push("⚽ Scorer Specialist");

  return badges;
}

/* ---------------------------------------------------
   ⭐ Map DB → API (Frontend-ready)
--------------------------------------------------- */
function mapDbLeagueToLeague(dbLeague: any): League {
  const membersRaw: LeagueMember[] = (dbLeague.members || []).map((m: any) => ({
    userId: m.userId,
    name: m.user?.name ?? "Unknown",
    points: m.points ?? 0,
    role: m.role ?? "MEMBER",
    badges: computeBadges(m),
  }));

  const sorted = [...membersRaw].sort((a, b) => b.points - a.points);

  const withRank = sorted.map((m, index) => ({
    ...m,
    rank: index + 1,
  }));

  return {
    id: dbLeague.id,
    name: dbLeague.name,
    logo: dbLeague.logo ?? null,
    isPrivate: dbLeague.isPrivate ?? false,
    members: withRank,
  };
}

/* ---------------------------------------------------
   ⭐ Get all leagues
--------------------------------------------------- */
export async function getAllLeagues(): Promise<League[]> {
  const dbLeagues = await prisma.league.findMany({
    include: { members: { include: { user: true } } },
  });

  return dbLeagues.map(mapDbLeagueToLeague);
}

/* ---------------------------------------------------
   ⭐ Get league by id (cached)
--------------------------------------------------- */
export async function getLeagueById(id: string): Promise<League | null> {
  const cacheKey = `league:${id}`;
  const cached = cacheGet<League>(cacheKey);
  if (cached) return cached;

  const dbLeague = await prisma.league.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  });

  if (!dbLeague) return null;

  const league = mapDbLeagueToLeague(dbLeague);

  cacheSet(cacheKey, league, 1000 * 30);

  return league;
}

/* ---------------------------------------------------
   ⭐ Get leaderboard by league id
--------------------------------------------------- */
export async function getLeaderboardByLeagueId(
  id: string
): Promise<League | null> {
  return getLeagueById(id);
}

/* ---------------------------------------------------
   ⭐ Create league
--------------------------------------------------- */
export async function createLeague(name: string): Promise<League> {
  const dbLeague = await prisma.league.create({
    data: {
      name,
      code: generateLeagueCode(),
      logo: null,
      isPrivate: false,
    },
    include: { members: { include: { user: true } } },
  });

  cacheClearPrefix("league:");

  return mapDbLeagueToLeague(dbLeague);
}

/* ---------------------------------------------------
   ⭐ Join league
--------------------------------------------------- */
export async function joinLeague(
  leagueId: string,
  userId: string,
  _name: string
): Promise<LeagueMember | null> {
  const dbLeague = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { members: { include: { user: true } } },
  });

  if (!dbLeague) return null;

  const existing = dbLeague.members.find((m: any) => m.userId === userId);
  if (existing) {
    return {
      userId: existing.userId,
      name: existing.user?.name ?? "Unknown",
      points: existing.points ?? 0,
      role: existing.role ?? "MEMBER",
      rank: undefined,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const newMember = await prisma.leagueMember.create({
    data: {
      leagueId,
      userId,
      points: 0,
      role: "MEMBER",
    },
    include: { user: true },
  });

  cacheClearPrefix(`league:${leagueId}`);

  return {
    userId: newMember.userId,
    name: newMember.user?.name ?? "Unknown",
    points: newMember.points ?? 0,
    role: "MEMBER",
    rank: undefined,
  };
}

/* ---------------------------------------------------
   ⭐ Weekly Trophy Awarding
--------------------------------------------------- */
async function awardWeeklyTrophies(leagueId: string) {
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: true },
  });

  if (!members.length) return;

  const topScorer = [...members].sort((a, b) => b.points - a.points)[0];

  await (prisma as any).weeklyTrophy.create({
    data: {
      leagueId,
      userId: topScorer.userId,
      weekStart,
      weekEnd,
      trophy: "top_scorer",
    },
  });
}

/* ---------------------------------------------------
   ⭐ Recompute leaderboard for a finished match
--------------------------------------------------- */
export async function recomputeLeaderboardsForMatch(
  match: MatchModel
): Promise<League[]> {
  const predictions: PredictionModel[] = await getPredictionsByMatch(match.id);

  const dbLeagues = await prisma.league.findMany({
    include: { members: true },
  });

  for (const league of dbLeagues) {
    for (const member of league.members) {
      const prediction = predictions.find(
        (p) => p.userId === member.userId
      );
      if (!prediction) continue;

      const earnedPoints = calculatePredictionPoints(match, prediction);
      const newPoints = (member.points ?? 0) + earnedPoints;

      await prisma.leagueMember.update({
        where: { id: member.id },
        data: { points: newPoints },
      });
    }
  }

  cacheClearPrefix("league:");

  const finalLeagues = await prisma.league.findMany({
    include: { members: { include: { user: true } } },
  });

  return finalLeagues.map(mapDbLeagueToLeague);
}

/* ---------------------------------------------------
   ⭐ Pagination
--------------------------------------------------- */
export async function paginateLeague(
  leagueId: string,
  page: number,
  limit: number
) {
  const league = await getLeagueById(leagueId);
  if (!league) return null;

  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    leagueId,
    page,
    limit,
    totalMembers: league.members.length,
    members: league.members.slice(start, end),
  };
}

/* ---------------------------------------------------
   ⭐ Reset weekly / monthly
--------------------------------------------------- */
export async function resetWeeklyPoints(leagueId: string) {
  await awardWeeklyTrophies(leagueId);
  cacheClearPrefix("league:");
  return getLeagueById(leagueId);
}

export async function resetMonthlyPoints(leagueId: string) {
  cacheClearPrefix("league:");
  return getLeagueById(leagueId);
}
