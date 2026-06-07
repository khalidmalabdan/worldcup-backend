import { v4 as uuid } from "uuid";

export type MatchStatus = "upcoming" | "live" | "finished";

// ⭐ NEW — Event structure for goals, assists, etc.
export interface MatchEvent {
  minute: number;
  type: string;        // "REGULAR", "PENALTY", "OWN_GOAL", etc.
  scorer?: string;     // Player name
  assist?: string;     // Player name
  team?: string;       // Team name
}

export interface Match {
  id: string;              // internal ID
  externalId: number;      // Football-Data.org match ID
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  kickoffTime: number;     // timestamp in ms

  // ⭐ NEW — ISO string for frontend
  matchDate: string;

  status: MatchStatus;

  // Logos + Flags
  homeLogo?: string;
  awayLogo?: string;
  homeFlag?: string;
  awayFlag?: string;

  // ⭐ NEW — Scorers + Assists + Goal Events
  events?: MatchEvent[];
}

const matches: Match[] = [];

// -----------------------------
// GETTERS
// -----------------------------
export function getAllMatches() {
  return matches;
}

export function getMatchById(id: string) {
  return matches.find((m) => m.id === id);
}

export function getMatchByExternalId(externalId: number) {
  return matches.find((m) => m.externalId === externalId);
}

// -----------------------------
// CREATE MATCH (from API sync)
// -----------------------------
export function createMatch(data: {
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: number;
  homeLogo?: string;
  awayLogo?: string;
  homeFlag?: string;
  awayFlag?: string;
  events?: MatchEvent[];
}) {
  const match: Match = {
    id: uuid(),
    externalId: data.externalId,
    homeTeam: data.homeTeam,
    awayTeam: data.awayTeam,
    homeScore: 0,
    awayScore: 0,
    kickoffTime: data.kickoffTime,

    // ⭐ NEW — ISO string for frontend
    matchDate: new Date(data.kickoffTime).toISOString(),

    status: "upcoming",

    homeLogo: data.homeLogo,
    awayLogo: data.awayLogo,
    homeFlag: data.homeFlag,
    awayFlag: data.awayFlag,

    // ⭐ NEW — initialize events
    events: data.events ?? [],
  };

  matches.push(match);
  return match;
}

// -----------------------------
// LOCK CHECK (for predictions)
// -----------------------------
export function isMatchLocked(match: Match): boolean {
  return Date.now() >= match.kickoffTime;
}

// -----------------------------
// UPDATE SCORE (used by sync)
// -----------------------------
export function updateMatchScore(
  id: string,
  homeScore: number,
  awayScore: number
) {
  const match = getMatchById(id);
  if (!match) return null;

  match.homeScore = homeScore;
  match.awayScore = awayScore;

  if (Date.now() >= match.kickoffTime && match.status !== "finished") {
    match.status = "live";
  }

  match.status = "finished";

  return match;
}
