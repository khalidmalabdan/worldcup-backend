import prisma from "../prisma";

/* ---------------------------------------------------
   ⭐ Local Match Types (safe for scoring + API)
--------------------------------------------------- */
export interface MatchEvent {
  minute: number;
  type?: string;
  scorer?: string;
  assist?: string;
}

export interface MatchModel {
  id: string;
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoffTime: Date;
  matchDate: string;
  status: string;
  scored: boolean;
  homeLogo?: string;
  awayLogo?: string;
  homeFlag?: string;
  awayFlag?: string;
  events: MatchEvent[];
  homePlayers: string[];
  awayPlayers: string[];
}

/* ---------------------------------------------------
   ⭐ Helper: parse JSON fields
--------------------------------------------------- */
function mapDbMatch(db: any): MatchModel {
  return {
    ...db,
    events: db.events ? JSON.parse(db.events) : [],
    homePlayers: db.homePlayers ? JSON.parse(db.homePlayers) : [],
    awayPlayers: db.awayPlayers ? JSON.parse(db.awayPlayers) : [],
  };
}

/* ---------------------------------------------------
   ⭐ GET ALL MATCHES
--------------------------------------------------- */
export async function getAllMatches(): Promise<MatchModel[]> {
  const matches = await prisma.match.findMany({
    include: { predictions: true },
    orderBy: { kickoffTime: "asc" },
  });

  return matches.map(mapDbMatch);
}

/* ---------------------------------------------------
   ⭐ GET MATCH BY ID
--------------------------------------------------- */
export async function getMatchById(id: string): Promise<MatchModel | null> {
  const match = await prisma.match.findUnique({
    where: { id },
    include: { predictions: true },
  });

  return match ? mapDbMatch(match) : null;
}

/* ---------------------------------------------------
   ⭐ GET MATCH BY EXTERNAL ID
--------------------------------------------------- */
export async function getMatchByExternalId(
  externalId: number
): Promise<MatchModel | null> {
  const match = await prisma.match.findUnique({
    where: { externalId },
    include: { predictions: true },
  });

  return match ? mapDbMatch(match) : null;
}

/* ---------------------------------------------------
   ⭐ GET FINISHED MATCHES
--------------------------------------------------- */
export async function getFinishedMatches(): Promise<MatchModel[]> {
  const matches = await prisma.match.findMany({
    where: { status: "finished" },
    include: { predictions: true },
  });

  return matches.map(mapDbMatch);
}

/* ---------------------------------------------------
   ⭐ CREATE MATCH (API Sync)
--------------------------------------------------- */
export async function createMatch(data: {
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: number;
  homeLogo?: string;
  awayLogo?: string;
  homeFlag?: string;
  awayFlag?: string;
  events?: any[];
  homePlayers: string[];
  awayPlayers: string[];
}) {
  const match = await prisma.match.create({
    data: {
      externalId: data.externalId,
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      homeScore: 0,
      awayScore: 0,

      kickoffTime: new Date(data.kickoffTime),
      matchDate: new Date(data.kickoffTime).toISOString(),

      status: "upcoming",
      scored: false,

      homeLogo: data.homeLogo,
      awayLogo: data.awayLogo,
      homeFlag: data.homeFlag,
      awayFlag: data.awayFlag,

      events: JSON.stringify(data.events ?? []),
      homePlayers: JSON.stringify(data.homePlayers ?? []),
      awayPlayers: JSON.stringify(data.awayPlayers ?? []),
    },
  });

  return mapDbMatch(match);
}

/* ---------------------------------------------------
   ⭐ UPDATE MATCH SCORE
--------------------------------------------------- */
export async function updateMatchScore(
  id: string,
  homeScore: number,
  awayScore: number
) {
  const match = await prisma.match.update({
    where: { id },
    data: {
      homeScore,
      awayScore,
      status: "finished",
    },
  });

  return mapDbMatch(match);
}

/* ---------------------------------------------------
   ⭐ MARK MATCH AS SCORED
--------------------------------------------------- */
export async function markMatchAsScored(id: string) {
  const match = await prisma.match.update({
    where: { id },
    data: { scored: true },
  });

  return mapDbMatch(match);
}

/* ---------------------------------------------------
   ⭐ CLEAR SCORED FLAG
--------------------------------------------------- */
export async function clearMatchScoredFlag(id: string) {
  const match = await prisma.match.update({
    where: { id },
    data: { scored: false },
  });

  return mapDbMatch(match);
}
