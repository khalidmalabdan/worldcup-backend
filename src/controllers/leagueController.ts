import { Request, Response } from "express";
import {
  createLeague,
  joinLeague,
  getLeagueLeaderboard,
  kickMember,
  updateMemberRole,
  renameLeague,
  deleteLeague,
  regenerateLeagueCode,
  leaveLeague,
} from "../services/leagueService";
import { AuthRequest } from "../middleware/authMiddleware";

/* ---------------------------------------------------
   Create League
--------------------------------------------------- */
export async function createLeagueHandler(req: AuthRequest, res: Response) {
  const { name } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!name) return res.status(400).json({ error: "Name required" });

  const league = await createLeague(userId, name);
  res.json(league);
}

/* ---------------------------------------------------
   Join League
--------------------------------------------------- */
export async function joinLeagueHandler(req: AuthRequest, res: Response) {
  const { code } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!code) return res.status(400).json({ error: "Code required" });

  try {
    const league = await joinLeague(userId, code.toUpperCase());
    res.json(league);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   League Leaderboard
--------------------------------------------------- */
export async function leagueLeaderboardHandler(req: Request, res: Response) {
  const rawId = req.params.id;
  const leagueId = Array.isArray(rawId) ? rawId[0] : rawId;

  const members = await getLeagueLeaderboard(leagueId);
  res.json(members);
}

/* ---------------------------------------------------
   Admin: Kick Member
--------------------------------------------------- */
export async function kickMemberHandler(req: AuthRequest, res: Response) {
  const { leagueId, memberId } = req.body;
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await kickMember(adminId, leagueId, memberId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Admin: Promote / Demote
--------------------------------------------------- */
export async function updateRoleHandler(req: AuthRequest, res: Response) {
  const { leagueId, memberId, role } = req.body;
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await updateMemberRole(adminId, leagueId, memberId, role);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Admin: Rename League
--------------------------------------------------- */
export async function renameLeagueHandler(req: AuthRequest, res: Response) {
  const { leagueId, name } = req.body;
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await renameLeague(adminId, leagueId, name);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Admin: Delete League
--------------------------------------------------- */
export async function deleteLeagueHandler(req: AuthRequest, res: Response) {
  const { leagueId } = req.body;
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await deleteLeague(adminId, leagueId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Settings: Regenerate Invite Code
--------------------------------------------------- */
export async function regenerateLeagueCodeHandler(req: AuthRequest, res: Response) {
  const { leagueId } = req.body;
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const league = await regenerateLeagueCode(adminId, leagueId);
    res.json(league);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Settings: Leave League
--------------------------------------------------- */
export async function leaveLeagueHandler(req: AuthRequest, res: Response) {
  const { leagueId } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await leaveLeague(userId, leagueId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}
