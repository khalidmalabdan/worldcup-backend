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
  const { name } = req.body as { name?: string };
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!name) return res.status(400).json({ error: "Name required" });

  try {
    const league = await createLeague(userId, name);
    res.json(league);
  } catch (err) {
    console.error("Error creating league:", err);
    res.status(500).json({ error: "Failed to create league" });
  }
}

/* ---------------------------------------------------
   Join League
--------------------------------------------------- */
export async function joinLeagueHandler(req: AuthRequest, res: Response) {
  const { code } = req.body as { code?: string };
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
  const { id } = req.params as { id: string };

  try {
    const members = await getLeagueLeaderboard(id);
    res.json(members);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}

/* ---------------------------------------------------
   Admin: Kick Member
   (Legacy admin route — still supported)
--------------------------------------------------- */
export async function kickMemberHandler(req: AuthRequest, res: Response) {
  const { leagueId, memberId } = req.body as {
    leagueId?: string;
    memberId?: string;
  };
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });
  if (!leagueId || !memberId)
    return res.status(400).json({ error: "leagueId and memberId required" });

  try {
    const result = await kickMember(adminId, leagueId, memberId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Admin: Promote / Demote
   (Legacy admin route — still supported)
--------------------------------------------------- */
export async function updateRoleHandler(req: AuthRequest, res: Response) {
  const { leagueId, memberId, role } = req.body as {
    leagueId?: string;
    memberId?: string;
    role?: string;
  };
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });
  if (!leagueId || !memberId || !role)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await updateMemberRole(adminId, leagueId, memberId, role);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Admin: Rename League
   (Legacy admin route — still supported)
--------------------------------------------------- */
export async function renameLeagueHandler(req: AuthRequest, res: Response) {
  const { leagueId, name } = req.body as {
    leagueId?: string;
    name?: string;
  };
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });
  if (!leagueId || !name)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const result = await renameLeague(adminId, leagueId, name);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}

/* ---------------------------------------------------
   Admin: Delete League
   (Legacy admin route — still supported)
--------------------------------------------------- */
export async function deleteLeagueHandler(req: AuthRequest, res: Response) {
  const { leagueId } = req.body as { leagueId?: string };
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });
  if (!leagueId)
    return res.status(400).json({ error: "leagueId required" });

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
export async function regenerateLeagueCodeHandler(
  req: AuthRequest,
  res: Response
) {
  const { leagueId } = req.body as { leagueId?: string };
  const adminId = req.user?.id;

  if (!adminId) return res.status(401).json({ error: "Unauthorized" });
  if (!leagueId)
    return res.status(400).json({ error: "leagueId required" });

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
  const { leagueId } = req.body as { leagueId?: string };
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!leagueId)
    return res.status(400).json({ error: "leagueId required" });

  try {
    const result = await leaveLeague(userId, leagueId);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}
