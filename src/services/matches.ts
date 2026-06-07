// worldcup-backend/src/services/matches.ts

import { storedMatches } from "./footballData";

export async function getAllMatches() {
  return storedMatches;
}
