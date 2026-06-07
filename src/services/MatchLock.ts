import { Match } from "../models/Match";

export function isMatchLocked(match: Match): boolean {
  const now = Date.now();
  return now >= match.kickoffTime;
}
