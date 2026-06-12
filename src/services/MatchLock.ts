import { MatchModel } from "../models/Match";

export function isMatchLocked(match: MatchModel): boolean {
  return Date.now() >= new Date(match.kickoffTime).getTime();
}
