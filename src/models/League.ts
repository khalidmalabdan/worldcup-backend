import { v4 as uuid } from "uuid";
import { Match } from "./Match";
import { getPredictionsForMatch } from "./Predictions";
import { calculatePredictionPoints } from "../services/scoring";

export interface LeagueMember {
  userId: string;
  name: string;

  // All‑time points
  points: number;

  // Weekly & monthly points
  weeklyPoints: number;
  monthlyPoints: number;

  // Badges
  doublePointUsed?: boolean;
  mostImproved?: boolean;

  // Tie-breaker stats
  exactScores: number;
  correctScorers: number;
  correctAssists: number;

  // Achievements
  achievements: string[];

  // Rank number
  rank?: number;
}

export interface League {
  id: string;
  name: string;
  members: LeagueMember[];
}

const leagues: League[] = [
  {
    id: uuid(),
    name: "Global League",
    members: [],
  },
];

export function getAllLeagues() {
  return leagues;
}

export function getLeagueById(id: string) {
  return leagues.find((l) => l.id === id);
}

export function createLeague(name: string) {
  const league: League = { id: uuid(), name, members: [] };
  leagues.push(league);
  return league;
}

export function joinLeague(leagueId: string, userId: string, name: string) {
  const league = getLeagueById(leagueId);
  if (!league) return null;

  const existing = league.members.find((m) => m.userId === userId);
  if (existing) return existing;

  const member: LeagueMember = {
    userId,
    name,
    points: 0,
    weeklyPoints: 0,
    monthlyPoints: 0,
    exactScores: 0,
    correctScorers: 0,
    correctAssists: 0,
    achievements: [],
  };

  league.members.push(member);
  return member;
}

// Helper: check if match is in current week
function isThisWeek(date: Date) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);
  return date >= weekStart;
}

// Helper: check if match is in current month
function isThisMonth(date: Date) {
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

// ⭐ UPDATED — scoring + achievements + ranks + tie-breakers
export function recomputeLeaderboardsForMatch(match: Match): League[] {
  const predictions = getPredictionsForMatch(match.id);
  const matchDate = new Date(match.kickoffTime);

  leagues.forEach((league) => {
    let maxWeeklyGain = 0;

    league.members.forEach((member) => {
      const prediction = predictions.find((p) => p.userId === member.userId);
      if (!prediction) return;

      const earnedPoints = calculatePredictionPoints(match, prediction);

      // All‑time points
      member.points += earnedPoints;

      // Weekly points
      if (isThisWeek(matchDate)) {
        member.weeklyPoints += earnedPoints;
        if (member.weeklyPoints > maxWeeklyGain) {
          maxWeeklyGain = member.weeklyPoints;
        }
      }

      // Monthly points
      if (isThisMonth(matchDate)) {
        member.monthlyPoints += earnedPoints;
      }

      // Tie-breaker stats
      if (
        prediction.predictedHomeScore === match.homeScore &&
        prediction.predictedAwayScore === match.awayScore
      ) {
        member.exactScores += 1;
      }

      const actualScorers = match.events.map((e) => e.scorer);
      const actualAssists = match.events.map((e) => e.assist);

      prediction.predictedScorers.forEach((s) => {
        if (actualScorers.includes(s)) {
          member.correctScorers += 1;
        }
      });

      prediction.predictedAssists.forEach((a) => {
        if (actualAssists.includes(a)) {
          member.correctAssists += 1;
        }
      });

      // Double Point badge
      member.doublePointUsed = prediction.doublePoint === true;

      // ⭐ ACHIEVEMENTS

      // Hat‑trick Predictor
      const hatTrickers = actualScorers.filter(
        (s, i, arr) => arr.filter((x) => x === s).length >= 3
      );
      if (
        hatTrickers.length > 0 &&
        prediction.predictedScorers.some((s) => hatTrickers.includes(s))
      ) {
        if (!member.achievements.includes("Hat‑trick Predictor")) {
          member.achievements.push("Hat‑trick Predictor");
        }
      }

      // ⭐ Exact Score Master (10 exact scores)
      if (member.exactScores >= 10 && !member.achievements.includes("Exact Score Master")) {
        member.achievements.push("Exact Score Master");
      }

      // ⭐ Golden Predictor (100 total points)
      if (member.points >= 100 && !member.achievements.includes("Golden Predictor")) {
        member.achievements.push("Golden Predictor");
      }

      // ⭐ Assist Genius (20 correct assists)
      if (member.correctAssists >= 20 && !member.achievements.includes("Assist Genius")) {
        member.achievements.push("Assist Genius");
      }

      // ⭐ Scorer Specialist (20 correct scorers)
      if (member.correctScorers >= 20 && !member.achievements.includes("Scorer Specialist")) {
        member.achievements.push("Scorer Specialist");
      }
    });

    // ⭐ Perfect Week (highest weekly score)
    league.members
      .filter((m) => m.weeklyPoints === maxWeeklyGain && maxWeeklyGain > 0)
      .forEach((m) => {
        if (!m.achievements.includes("Perfect Week")) {
          m.achievements.push("Perfect Week");
        }
        m.mostImproved = true;
      });

    // ⭐ SORT MEMBERS BY TIE-BREAKERS
    league.members.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactScores !== a.exactScores)
        return b.exactScores - a.exactScores;
      if (b.correctScorers !== a.correctScorers)
        return b.correctScorers - a.correctScorers;
      return b.correctAssists - a.correctAssists;
    });

    // ⭐ ASSIGN RANKS
    league.members.forEach((m, i) => {
      m.rank = i + 1;
    });
  });

  return leagues;
}

// ⭐ PAGINATION HELPER
export function paginateLeague(leagueId: string, page: number, limit: number) {
  const league = getLeagueById(leagueId);
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

// ⭐ RESET WEEKLY POINTS
export function resetWeeklyPoints(leagueId: string) {
  const league = getLeagueById(leagueId);
  if (!league) return null;

  league.members.forEach((m) => {
    m.weeklyPoints = 0;
    m.mostImproved = false;
  });

  return league;
}

// ⭐ RESET MONTHLY POINTS
export function resetMonthlyPoints(leagueId: string) {
  const league = getLeagueById(leagueId);
  if (!league) return null;

  league.members.forEach((m) => {
    m.monthlyPoints = 0;
  });

  return league;
}
