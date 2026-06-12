// worldcup-backend/src/services/matches.ts

import prisma from "../prisma";

export async function getAllMatches() {
  return prisma.match.findMany({
    orderBy: { kickoffTime: "asc" },
  });
}
