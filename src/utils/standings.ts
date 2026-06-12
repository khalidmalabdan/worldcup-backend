// worldcup-backend/src/utils/standings.ts
import { GROUPS } from "../config/groups";
import { Match } from "@prisma/client";

// Prisma Match + predictions relation
export type MatchWithPredictions = Match & {
  predictions: any[];
};

export interface TeamStanding {
  team: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export type GroupStandings = Record<string, TeamStanding[]>;

function getGroupForTeam(team: string): string | null {
  for (const [group, teams] of Object.entries(GROUPS)) {
    if (teams.includes(team)) return group;
  }
  return null;
}

export function computeStandings(
  matches: MatchWithPredictions[]
): GroupStandings {
  const standings: Record<string, Record<string, TeamStanding>> = {};

  // Initialize all teams
  for (const [group, teams] of Object.entries(GROUPS)) {
    standings[group] = standings[group] || {};
    for (const team of teams) {
      standings[group][team] = {
        team,
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
      };
    }
  }

  // Process finished matches
  for (const match of matches) {
    if (match.status !== "finished") continue;
    if (match.homeScore == null || match.awayScore == null) continue;

    const homeGroup = getGroupForTeam(match.homeTeam);
    const awayGroup = getGroupForTeam(match.awayTeam);

    if (!homeGroup || !awayGroup || homeGroup !== awayGroup) continue;

    const group = homeGroup;
    const home = standings[group][match.homeTeam];
    const away = standings[group][match.awayTeam];

    home.mp += 1;
    away.mp += 1;

    home.gf += match.homeScore;
    home.ga += match.awayScore;
    home.gd = home.gf - home.ga;

    away.gf += match.awayScore;
    away.ga += match.homeScore;
    away.gd = away.gf - away.ga;

    if (match.homeScore > match.awayScore) {
      home.w += 1;
      away.l += 1;
      home.pts += 3;
    } else if (match.homeScore < match.awayScore) {
      away.w += 1;
      home.l += 1;
      away.pts += 3;
    } else {
      home.d += 1;
      away.d += 1;
      home.pts += 1;
      away.pts += 1;
    }
  }

  // Sort teams inside each group
  const result: GroupStandings = {};
  for (const [group, teamsMap] of Object.entries(standings)) {
    const teams = Object.values(teamsMap).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.localeCompare(b.team);
    });
    result[group] = teams;
  }

  return result;
}
